import { supabase } from '../config/supabase';
import type {
  LeaveType,
  EmployeeLeaveBalance,
  LeaveApplication,
  AttendanceRecord,
  Holiday,
  MonthlyAttendanceSummary
} from '../types/payroll';
import { getFinancialYear } from '../utils/indianTaxCalculator';

export const leaveAttendanceService = {
  // =====================================================
  // LEAVE TYPE MANAGEMENT
  // =====================================================

  async getLeaveTypes(): Promise<LeaveType[]> {
    const { data, error } = await supabase
      .from('leave_types')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getLeaveTypeById(id: string): Promise<LeaveType | null> {
    const { data, error } = await supabase
      .from('leave_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // =====================================================
  // LEAVE BALANCE MANAGEMENT
  // =====================================================

  async getEmployeeLeaveBalance(
    employeeId: string,
    financialYear?: string
  ): Promise<EmployeeLeaveBalance[]> {
    const fy = financialYear || getFinancialYear();

    const { data, error } = await supabase
      .from('employee_leave_balance')
      .select(`
        *,
        leave_type:leave_types(*)
      `)
      .eq('employee_id', employeeId)
      .eq('financial_year', fy);

    if (error) throw error;
    return data || [];
  },

  async initializeLeaveBalance(
    employeeId: string,
    financialYear?: string
  ): Promise<void> {
    const fy = financialYear || getFinancialYear();
    const leaveTypes = await this.getLeaveTypes();

    const balances = leaveTypes.map(lt => ({
      employee_id: employeeId,
      leave_type_id: lt.id,
      financial_year: fy,
      opening_balance: 0,
      earned: lt.max_days_per_year,
      taken: 0,
      carry_forward: 0,
      encashed: 0,
      lapsed: 0,
      available: lt.max_days_per_year
    }));

    const { error } = await supabase
      .from('employee_leave_balance')
      .upsert(balances, {
        onConflict: 'employee_id,leave_type_id,financial_year'
      });

    if (error) throw error;
  },

  async updateLeaveBalance(
    employeeId: string,
    leaveTypeId: string,
    taken: number,
    financialYear?: string
  ): Promise<void> {
    const fy = financialYear || getFinancialYear();

    const { data: balance } = await supabase
      .from('employee_leave_balance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('leave_type_id', leaveTypeId)
      .eq('financial_year', fy)
      .single();

    if (!balance) {
      await this.initializeLeaveBalance(employeeId, fy);
    }

    const newTaken = (balance?.taken || 0) + taken;
    const available = (balance?.earned || 0) + (balance?.carry_forward || 0) - newTaken;

    const { error } = await supabase
      .from('employee_leave_balance')
      .update({
        taken: newTaken,
        available: Math.max(0, available)
      })
      .eq('employee_id', employeeId)
      .eq('leave_type_id', leaveTypeId)
      .eq('financial_year', fy);

    if (error) throw error;
  },

  // =====================================================
  // LEAVE APPLICATION MANAGEMENT
  // =====================================================

  async getLeaveApplications(filters?: {
    employeeId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<LeaveApplication[]> {
    let query = supabase
      .from('leave_applications')
      .select(`
        *,
        employee:employees(*),
        leave_type:leave_types(*),
        approver:employees!approved_by(*)
      `)
      .order('applied_at', { ascending: false });

    if (filters?.employeeId) {
      query = query.eq('employee_id', filters.employeeId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.fromDate) {
      query = query.gte('from_date', filters.fromDate);
    }
    if (filters?.toDate) {
      query = query.lte('to_date', filters.toDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async applyLeave(application: {
    employee_id: string;
    leave_type_id: string;
    from_date: string;
    to_date: string;
    half_day?: boolean;
    reason: string;
    contact_during_leave?: string;
  }): Promise<LeaveApplication> {
    // Calculate total days
    const fromDate = new Date(application.from_date);
    const toDate = new Date(application.to_date);
    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
    let totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (application.half_day) {
      totalDays = 0.5;
    }

    // Check if employee has sufficient balance
    const fy = getFinancialYear(fromDate);
    const balances = await this.getEmployeeLeaveBalance(application.employee_id, fy);
    const balance = balances.find(b => b.leave_type_id === application.leave_type_id);

    if (!balance || balance.available < totalDays) {
      throw new Error('Insufficient leave balance');
    }

    const { data, error } = await supabase
      .from('leave_applications')
      .insert([{
        ...application,
        total_days: totalDays,
        applied_by: application.employee_id,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async approveLeave(
    applicationId: string,
    approverId: string,
    remarks?: string
  ): Promise<LeaveApplication> {
    // Get the application
    const { data: application } = await supabase
      .from('leave_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (!application) throw new Error('Leave application not found');

    // Update leave balance
    await this.updateLeaveBalance(
      application.employee_id,
      application.leave_type_id,
      application.total_days
    );

    // Approve the application
    const { data, error } = await supabase
      .from('leave_applications')
      .update({
        status: 'approved',
        approved_by: approverId,
        approved_at: new Date().toISOString(),
        approval_remarks: remarks
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async rejectLeave(
    applicationId: string,
    approverId: string,
    remarks: string
  ): Promise<LeaveApplication> {
    const { data, error } = await supabase
      .from('leave_applications')
      .update({
        status: 'rejected',
        approved_by: approverId,
        approved_at: new Date().toISOString(),
        approval_remarks: remarks
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async cancelLeave(
    applicationId: string,
    reason: string
  ): Promise<LeaveApplication> {
    // Get the application
    const { data: application } = await supabase
      .from('leave_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (!application) throw new Error('Leave application not found');

    // If it was approved, restore the balance
    if (application.status === 'approved') {
      await this.updateLeaveBalance(
        application.employee_id,
        application.leave_type_id,
        -application.total_days // Negative to add back
      );
    }

    const { data, error } = await supabase
      .from('leave_applications')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // =====================================================
  // ATTENDANCE MANAGEMENT
  // =====================================================

  async getAttendanceRecords(filters: {
    employeeId?: string;
    fromDate: string;
    toDate: string;
  }): Promise<AttendanceRecord[]> {
    let query = supabase
      .from('attendance_records')
      .select('*')
      .gte('attendance_date', filters.fromDate)
      .lte('attendance_date', filters.toDate)
      .order('attendance_date', { ascending: false });

    if (filters.employeeId) {
      query = query.eq('employee_id', filters.employeeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async checkIn(
    employeeId: string,
    location?: string,
    ip?: string
  ): Promise<AttendanceRecord> {
    const today = new Date().toISOString().split('T')[0];

    // Check if already checked in
    const { data: existing } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('attendance_date', today)
      .single();

    if (existing) {
      throw new Error('Already checked in for today');
    }

    const { data, error } = await supabase
      .from('attendance_records')
      .insert([{
        employee_id: employeeId,
        attendance_date: today,
        check_in_time: new Date().toISOString(),
        check_in_location: location,
        check_in_ip: ip,
        status: 'present'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async checkOut(
    employeeId: string,
    location?: string
  ): Promise<AttendanceRecord> {
    const today = new Date().toISOString().split('T')[0];

    const { data: attendance } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('attendance_date', today)
      .single();

    if (!attendance) {
      throw new Error('No check-in record found for today');
    }

    if (attendance.check_out_time) {
      throw new Error('Already checked out');
    }

    const checkOutTime = new Date();
    const checkInTime = new Date(attendance.check_in_time);
    const totalMs = checkOutTime.getTime() - checkInTime.getTime();
    const totalHours = totalMs / (1000 * 60 * 60);

    // Calculate overtime (if more than 8 hours)
    const workHours = Math.min(totalHours, 8);
    const overtimeHours = Math.max(0, totalHours - 8);

    const { data, error } = await supabase
      .from('attendance_records')
      .update({
        check_out_time: checkOutTime.toISOString(),
        check_out_location: location,
        total_hours: Number(totalHours.toFixed(2)),
        work_hours: Number(workHours.toFixed(2)),
        overtime_hours: Number(overtimeHours.toFixed(2))
      })
      .eq('id', attendance.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async regularizeAttendance(
    attendanceId: string,
    regularizedBy: string,
    reason: string,
    updates: {
      check_in_time?: string;
      check_out_time?: string;
      status?: string;
    }
  ): Promise<AttendanceRecord> {
    const { data, error } = await supabase
      .from('attendance_records')
      .update({
        ...updates,
        is_regularized: true,
        regularized_by: regularizedBy,
        regularized_at: new Date().toISOString(),
        regularization_reason: reason
      })
      .eq('id', attendanceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getMonthlyAttendanceSummary(
    employeeId: string,
    month: number,
    year: number
  ): Promise<MonthlyAttendanceSummary> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const records = await this.getAttendanceRecords({
      employeeId,
      fromDate: startDate.toISOString().split('T')[0],
      toDate: endDate.toISOString().split('T')[0]
    });

    const summary: MonthlyAttendanceSummary = {
      employee_id: employeeId,
      month,
      year,
      total_working_days: endDate.getDate(),
      present_days: records.filter(r => r.status === 'present').length,
      absent_days: records.filter(r => r.status === 'absent').length,
      half_days: records.filter(r => r.status === 'half-day').length,
      leave_days: records.filter(r => r.status === 'on-leave').length,
      holidays: records.filter(r => r.status === 'holiday').length,
      week_offs: records.filter(r => r.status === 'week-off').length,
      paid_days: 0,
      lop_days: 0,
      total_hours: records.reduce((sum, r) => sum + (r.total_hours || 0), 0),
      work_hours: records.reduce((sum, r) => sum + (r.work_hours || 0), 0),
      overtime_hours: records.reduce((sum, r) => sum + (r.overtime_hours || 0), 0)
    };

    // Calculate paid days and LOP
    summary.paid_days = summary.present_days + summary.half_days * 0.5 + summary.leave_days;
    summary.lop_days = Math.max(0, summary.total_working_days - summary.paid_days - summary.holidays - summary.week_offs);

    return summary;
  },

  // =====================================================
  // HOLIDAY MANAGEMENT
  // =====================================================

  async getHolidays(year?: number): Promise<Holiday[]> {
    let query = supabase
      .from('holidays')
      .select('*')
      .order('holiday_date');

    if (year) {
      query = query
        .gte('holiday_date', `${year}-01-01`)
        .lte('holiday_date', `${year}-12-31`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async addHoliday(holiday: Omit<Holiday, 'id' | 'created_at' | 'updated_at'>): Promise<Holiday> {
    const { data, error } = await supabase
      .from('holidays')
      .insert([holiday])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

export default leaveAttendanceService;
