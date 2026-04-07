import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Register from './components/Register';
import Servers from './components/Servers';
import StaffRoster from './components/StaffRoster';
import Punishments from './components/Punishments';
import LOA from './components/LOA';
import Threads from './components/Threads';
import AdminPanel from './components/AdminPanel';
import Profile from './components/Profile';
import ServerPanel from './components/ServerPanel';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  return isAdmin ? <>{children}</> : <Navigate to="/" />;
}

function StaffRoute({ children }: { children: React.ReactNode }) {
  const { isStaff, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  return isStaff ? <>{children}</> : <Navigate to="/" />;
}

import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './firebase';

// Test connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}
testConnection();

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="servers" element={<Servers />} />
            <Route path="servers/:serverId" element={<ServerPanel />} />
            <Route path="staff" element={<StaffRoute><StaffRoster /></StaffRoute>} />
            <Route path="punishments" element={<StaffRoute><Punishments /></StaffRoute>} />
            <Route path="loa" element={<StaffRoute><LOA /></StaffRoute>} />
            <Route path="threads" element={<StaffRoute><Threads /></StaffRoute>} />
            <Route path="admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
