import { Navigate } from 'react-router-dom';

interface ProtectedEmployeeRouteProps {
  children: React.ReactNode;
}

export default function ProtectedEmployeeRoute({ children }: ProtectedEmployeeRouteProps) {
  const session = sessionStorage.getItem('employee_session');
  
  if (!session) {
    // Redirect to employee login if not authenticated
    return <Navigate to="/employee/login" replace />;
  }

  try {
    const employee = JSON.parse(session);
    if (!employee.id || !employee.email) {
      // Invalid session data
      sessionStorage.removeItem('employee_session');
      return <Navigate to="/employee/login" replace />;
    }
  } catch (error) {
    // Corrupted session data
    sessionStorage.removeItem('employee_session');
    return <Navigate to="/employee/login" replace />;
  }

  return <>{children}</>;
}
