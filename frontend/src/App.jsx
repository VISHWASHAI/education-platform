import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Layout } from './components/common/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { Teachers } from './pages/Teachers';
import { Classes } from './pages/Classes';
import { Attendance } from './pages/Attendance';
import { Exams } from './pages/Exams';
import { ExamDetail } from './pages/ExamDetail';
import { Assignments } from './pages/Assignments';
import { AssignmentDetail } from './pages/AssignmentDetail';
import { Fees } from './pages/Fees';
import { Analytics } from './pages/Analytics';
import { AuditLog } from './pages/AuditLog';
import { BulkTools } from './pages/BulkTools';
import { Announcements } from './pages/Announcements';
import { Messages } from './pages/Messages';
import { Gallery } from './pages/Gallery';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UIProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/students" element={<Students />} />
              <Route path="/teachers" element={<Teachers />} />
              <Route path="/classes" element={<Classes />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/exams" element={<Exams />} />
              <Route path="/exams/:id" element={<ExamDetail />} />
              <Route path="/assignments" element={<Assignments />} />
              <Route path="/assignments/:id" element={<AssignmentDetail />} />
              <Route path="/fees" element={<Fees />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/audit-log" element={<AuditLog />} />
              <Route path="/bulk-tools" element={<BulkTools />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/gallery" element={<Gallery />} />
            </Route>
          </Routes>
        </UIProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
