import React, { useState, useEffect } from 'react';
import { Clock, ChevronLeft, ChevronRight, Save, AlertCircle } from 'lucide-react';
import { leaveAttendanceService } from '../../services/leaveAttendanceService';
import { leaveService } from '../../services/leaveService';
import { supabase } from '../../config/supabase';

interface DayAttendance {
  date: string;
  dayName: string;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isOnLeave: boolean;
  leaveTypeName?: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  saved: boolean;
}

export default function AttendanceMarking() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [weekData, setWeekData] = useState<DayAttendance[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [approvedLeaves, setApprovedLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ 
    show: false, 
    message: '', 
    type: 'success' 
  });
  const [currentUser] = useState(() => {
    const session = sessionStorage.getItem('employee_session');
    if (session) {
      const employee = JSON.parse(session);
      return { id: employee.id };
    }
    return { id: '' };
  });

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Get the start of the week (Monday)
  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  // Check if date is in the future
  function isFutureDate(date: string): boolean {
    return new Date(date) > new Date(new Date().toISOString().split('T')[0]);
  }

  // Check if week is in the future
  function isWeekInFuture(weekStart: Date): boolean {
    const today = new Date(new Date().toISOString().split('T')[0]);
    const currentWeekStart = getWeekStart(today);
    return weekStart > currentWeekStart;
  }

  useEffect(() => {
    loadWeekData();
  }, [currentWeekStart, holidays, approvedLeaves]);

  useEffect(() => {
    loadHolidays();
    loadApprovedLeaves();
  }, []);

  const loadHolidays = async () => {
    try {
      const year = currentWeekStart.getFullYear();
      const holidaysData = await leaveAttendanceService.getHolidays(year);
      setHolidays(holidaysData);
    } catch (error) {
      console.error('Error loading holidays:', error);
    }
  };

  const loadApprovedLeaves = async () => {
    try {
      if (!currentUser.id) return;
      const leavesData = await leaveService.getEmployeeLeaves(currentUser.id, { status: 'approved' });
      setApprovedLeaves(leavesData || []);
    } catch (error) {
      console.error('Error loading approved leaves:', error);
    }
  };

  const loadWeekData = async () => {
    try {
      setLoading(true);
      const weekDays: DayAttendance[] = [];

      // Generate 7 days starting from Monday
      for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(currentWeekStart.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const isWeekend = dayName === 'Sat' || dayName === 'Sun';
        
        // Check if it's a holiday
        const holiday = holidays.find(h => h.holiday_date === dateStr);
        const isHoliday = !!holiday;

        // Check if it's an approved leave day
        const leave = approvedLeaves.find(l => {
          const fromDate = new Date(l.from_date);
          const toDate = new Date(l.to_date);
          const currentDate = new Date(dateStr);
          return currentDate >= fromDate && currentDate <= toDate;
        });
        const isOnLeave = !!leave;

        weekDays.push({
          date: dateStr,
          dayName,
          isWeekend,
          isHoliday,
          holidayName: holiday?.holiday_name,
          isOnLeave,
          leaveTypeName: leave?.leave_types?.name,
          checkIn: isOnLeave ? '' : '',
          checkOut: isOnLeave ? '' : '',
          hours: '0.0',
          saved: isOnLeave ? true : false
        });
      }

      // Load existing attendance records for the week
      const startDate = weekDays[0].date;
      const endDate = weekDays[6].date;

      const { data: attendanceRecords } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', currentUser.id)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate);

      // Auto-create holiday attendance records for past/current days
      const today = new Date().toISOString().split('T')[0];
      for (const day of weekDays) {
        if (day.isHoliday && day.date <= today && !isFutureDate(day.date)) {
          const existingRecord = attendanceRecords?.find(r => r.attendance_date === day.date);
          if (!existingRecord) {
            // Create holiday attendance record
            try {
              await supabase
                .from('attendance_records')
                .insert({
                  employee_id: currentUser.id,
                  attendance_date: day.date,
                  status: 'holiday',
                  work_hours: 0,
                  total_hours: 0,
                  break_hours: 0,
                  overtime_hours: 0,
                  is_regularized: false
                });
            } catch (error) {
              console.error('Error creating holiday attendance record:', error);
            }
          }
        }
      }

      // Reload attendance records after auto-creation
      const { data: updatedRecords } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', currentUser.id)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate);

      // Populate with existing data
      if (updatedRecords && updatedRecords.length > 0) {
        weekDays.forEach(day => {
          const record = updatedRecords.find(r => r.attendance_date === day.date);
          if (record) {
            // Extract HH:MM from timestamp (stored as IST, display as-is)
            if (record.check_in_time) {
              const timeStr = record.check_in_time.toString();
              const timeMatch = timeStr.match(/T?(\d{2}:\d{2})/);
              day.checkIn = timeMatch ? timeMatch[1] : '';
            }
            if (record.check_out_time) {
              const timeStr = record.check_out_time.toString();
              const timeMatch = timeStr.match(/T?(\d{2}:\d{2})/);
              day.checkOut = timeMatch ? timeMatch[1] : '';
            }
            // Recalculate hours from check-in/check-out times instead of using stored values
            // This ensures overnight shifts are calculated correctly
            day.hours = calculateHours(day.checkIn, day.checkOut);
            day.saved = true;
            // Don't override with default if on leave
            if (!day.isOnLeave && record.status === 'on-leave') {
              day.isOnLeave = true;
            }
          }
        });
      }

      setWeekData(weekDays);
    } catch (error) {
      console.error('Error loading week data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateHours = (checkIn: string, checkOut: string): string => {
    if (!checkIn || !checkOut) return '0.0';
    
    try {
      const start = new Date(`1970-01-01T${checkIn}`);
      let end = new Date(`1970-01-01T${checkOut}`);
      
      // If check-out is before check-in, assume it crosses midnight (overnight shift)
      if (end.getTime() < start.getTime()) {
        end = new Date(`1970-01-02T${checkOut}`); // Add one day
      }
      
      const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      
      if (diff < 0) return '0.0';
      return diff.toFixed(1);
    } catch {
      return '0.0';
    }
  };

  const handleTimeChange = (index: number, field: 'checkIn' | 'checkOut', value: string) => {
    const newWeekData = [...weekData];
    newWeekData[index][field] = value;
    newWeekData[index].hours = calculateHours(newWeekData[index].checkIn, newWeekData[index].checkOut);
    newWeekData[index].saved = false;
    setWeekData(newWeekData);
  };

  const handleSaveDay = async (index: number) => {
    const day = weekData[index];
    
    // Validate employee session
    if (!currentUser.id) {
      showToast('Session expired. Please log out and log back in.', 'error');
      return;
    }
    
    // Prevent marking attendance on holidays
    if (day.isHoliday) {
      showToast('Cannot mark attendance on company holidays', 'error');
      return;
    }

    // Prevent marking attendance when on leave
    if (day.isOnLeave) {
      showToast('Cannot mark attendance when on approved leave', 'error');
      return;
    }

    if (!day.checkIn || !day.checkOut) {
      showToast('Please enter both check-in and check-out times', 'error');
      return;
    }

    if (isFutureDate(day.date)) {
      showToast('Cannot mark attendance for future dates', 'error');
      return;
    }

    try {
      setSaving(true);

      const hours = parseFloat(day.hours);
      
      // Validate hours
      if (isNaN(hours) || hours < 0 || hours > 24) {
        showToast('Invalid hours calculated. Please check your check-in and check-out times.', 'error');
        return;
      }
      
      const status = hours >= 8 ? 'present' : hours >= 4 ? 'half-day' : 'absent';

      // Store timestamps as-is (user enters IST time, we store IST time)
      // For overnight shifts, both timestamps are stored on the check-in date
      const checkInTimestamp = `${day.date}T${day.checkIn}:00`;
      const checkOutTimestamp = `${day.date}T${day.checkOut}:00`;

      // Validate timestamps
      if (!checkInTimestamp || !checkOutTimestamp) {
        showToast('Invalid time format. Please enter times in HH:MM format.', 'error');
        return;
      }

      console.log('Saving attendance record:', {
        employee_id: currentUser.id,
        attendance_date: day.date,
        check_in_time: checkInTimestamp,
        check_out_time: checkOutTimestamp,
        work_hours: hours,
        total_hours: hours,
        status: status
      });

      // Use upsert to ensure existing records are always overwritten
      // This handles both create and update operations in one call
      const { data: upsertData, error: upsertError } = await supabase
        .from('attendance_records')
        .upsert(
          {
            employee_id: currentUser.id,
            attendance_date: day.date,
            check_in_time: checkInTimestamp,
            check_out_time: checkOutTimestamp,
            work_hours: hours,
            total_hours: hours,
            status: status,
            break_hours: 0,
            overtime_hours: hours > 8 ? hours - 8 : 0,
            is_regularized: false,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'employee_id,attendance_date',
            ignoreDuplicates: false // Ensure we update existing records
          }
        );

      if (upsertError) {
        console.error('Upsert error details:', upsertError);
        throw upsertError;
      }

      console.log('Upsert successful:', upsertData);

      // Mark as saved
      const newWeekData = [...weekData];
      newWeekData[index].saved = true;
      setWeekData(newWeekData);

      showToast('Attendance saved successfully!', 'success');
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to save attendance';
      
      if (error?.code === '23505') {
        // Unique constraint violation
        errorMessage = 'Attendance record already exists for this date';
      } else if (error?.code === '23503') {
        // Foreign key constraint violation
        errorMessage = 'Invalid employee information. Please try logging out and back in.';
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.error_description) {
        errorMessage = error.error_description;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    
    // Don't allow future weeks
    if (!isWeekInFuture(newDate)) {
      setCurrentWeekStart(newDate);
    }
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getWeekStart(new Date()));
  };

  const getTotalWeeklyHours = () => {
    return weekData.reduce((sum, day) => sum + parseFloat(day.hours || '0'), 0).toFixed(1);
  };

  const isCurrentWeek = () => {
    const today = new Date();
    const currentStart = getWeekStart(today);
    return currentWeekStart.toDateString() === currentStart.toDateString();
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-4 z-50 px-4 sm:px-6 py-3 rounded-lg shadow-lg flex items-center justify-center sm:justify-start space-x-2 ${ 
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <span className="text-sm sm:text-base">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-600 mt-1 text-xs sm:text-sm">Mark your daily check-in and check-out times</p>
      </div>

      {/* Week Navigation */}
      <div className="bg-white rounded-lg shadow-md p-2 sm:p-3 mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousWeek}
            className="flex items-center px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 touch-manipulation"
          >
            <ChevronLeft className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="text-center flex-1 mx-2">
            <h2 className="text-xs sm:text-base font-semibold text-gray-900">
              <span className="hidden sm:inline">
                {currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' - '}
                {new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="sm:hidden">
                {currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' - '}
                {new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </h2>
            {!isCurrentWeek() && (
              <button
                onClick={goToCurrentWeek}
                className="text-[10px] sm:text-xs text-primary-600 hover:text-primary-700 font-medium mt-0.5"
              >
                Go to Current Week
              </button>
            )}
          </div>

          <button
            onClick={goToNextWeek}
            disabled={isWeekInFuture(new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000))}
            className="flex items-center px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4 sm:ml-1" />
          </button>
        </div>
      </div>

      {/* Weekly Hours Summary */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg shadow-md p-3 sm:p-4 mb-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-100 text-[10px] sm:text-xs font-medium">Total Weekly Hours</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{getTotalWeeklyHours()}h</p>
          </div>
          <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-primary-200" />
        </div>
      </div>

      {/* Attendance - Mobile Cards View */}
      <div className="sm:hidden space-y-3 mb-4">
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600">Loading...</span>
            </div>
          </div>
        ) : (
          weekData.map((day, index) => {
            const isDisabled = day.isHoliday || day.isOnLeave || isFutureDate(day.date);
            const cardClass = day.isHoliday 
              ? 'border-l-4 border-red-500 bg-red-50'
              : day.isOnLeave
              ? 'border-l-4 border-blue-500 bg-blue-50'
              : day.isWeekend
              ? 'bg-gray-50'
              : 'bg-white';

            return (
              <div key={day.date} className={`rounded-lg shadow-md p-3 ${cardClass}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-semibold text-gray-900">
                      {day.dayName}, {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {day.isHoliday && (
                      <span className="text-xs text-red-600 flex items-center mt-0.5">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {day.holidayName}
                      </span>
                    )}
                    {day.isOnLeave && (
                      <span className="text-xs text-blue-600 flex items-center mt-0.5">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        On {day.leaveTypeName}
                      </span>
                    )}
                  </div>
                  <span className={`text-lg font-bold ${
                    parseFloat(day.hours) >= 8 
                      ? 'text-green-600' 
                      : parseFloat(day.hours) >= 4 
                      ? 'text-yellow-600' 
                      : 'text-gray-600'
                  }`}>
                    {day.hours}h
                  </span>
                </div>
                
                {!isDisabled && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 uppercase">In</label>
                      <input
                        type="time"
                        value={day.checkIn}
                        onChange={(e) => handleTimeChange(index, 'checkIn', e.target.value)}
                        step="60"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm touch-manipulation"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 uppercase">Out</label>
                      <input
                        type="time"
                        value={day.checkOut}
                        onChange={(e) => handleTimeChange(index, 'checkOut', e.target.value)}
                        step="60"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm touch-manipulation"
                      />
                    </div>
                    <div className="flex-shrink-0 pt-4">
                      {day.saved ? (
                        <span className="inline-flex items-center px-2 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSaveDay(index)}
                          disabled={saving}
                          className="inline-flex items-center px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-md hover:bg-primary-700 disabled:opacity-50 touch-manipulation"
                        >
                          <Save className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Attendance Table - Desktop View */}
      <div className="hidden sm:block bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Day
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check-In
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check-Out
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      <span className="ml-3 text-gray-600">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : (
                weekData.map((day, index) => {
                  const isDisabled = day.isHoliday || day.isOnLeave || isFutureDate(day.date);
                  const rowClass = day.isWeekend 
                    ? 'bg-gray-50' 
                    : day.isHoliday 
                    ? 'bg-red-100 border-l-4 border-red-500'
                    : day.isOnLeave
                    ? 'bg-blue-100 border-l-4 border-blue-500'
                    : '';

                  return (
                    <tr key={day.date} className={rowClass}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex flex-col">
                          <span className={`font-medium ${day.isWeekend ? 'text-gray-500' : ''}`}>
                            {day.dayName}
                          </span>
                          {day.isHoliday && (
                            <span className="text-xs text-red-600 flex items-center mt-1">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {day.holidayName}
                            </span>
                          )}
                          {day.isOnLeave && (
                            <span className="text-xs text-blue-600 flex items-center mt-1">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              On {day.leaveTypeName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="time"
                          value={day.checkIn}
                          onChange={(e) => handleTimeChange(index, 'checkIn', e.target.value)}
                          disabled={isDisabled}
                          step="60"
                          className={`px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm ${
                            isDisabled 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : 'bg-white border-gray-300'
                          }`}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="time"
                          value={day.checkOut}
                          onChange={(e) => handleTimeChange(index, 'checkOut', e.target.value)}
                          disabled={isDisabled}
                          step="60"
                          className={`px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm ${
                            isDisabled 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : 'bg-white border-gray-300'
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-sm font-semibold ${
                          parseFloat(day.hours) >= 8 
                            ? 'text-green-600' 
                            : parseFloat(day.hours) >= 4 
                            ? 'text-yellow-600' 
                            : 'text-gray-600'
                        }`}>
                          {day.hours}h
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {day.saved ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Saved
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSaveDay(index)}
                            disabled={isDisabled || saving}
                            className="inline-flex items-center px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {saving ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-3 h-3 mr-1" />
                                Save
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 bg-white rounded-lg shadow-md p-3">
        <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Legend:</h3>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white border border-gray-300 rounded mr-1.5 sm:mr-2"></div>
            <span className="text-gray-600">Working Day</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-50 border border-gray-300 rounded mr-1.5 sm:mr-2"></div>
            <span className="text-gray-600">Weekend</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-100 border-l-2 sm:border-l-4 border-red-500 rounded mr-1.5 sm:mr-2"></div>
            <span className="text-gray-600">Holiday</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-100 border-l-2 sm:border-l-4 border-blue-500 rounded mr-1.5 sm:mr-2"></div>
            <span className="text-gray-600">On Leave</span>
          </div>
        </div>
      </div>
    </div>
  );
}
