import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AlertModal } from '../ui/Modal';
import { 
  Upload, 
  Download, 
  Users, 
  UserPlus, 
  Trash2, 
  Edit,
  Save,
  X,
  Eye,
  EyeOff,
  Plus,
  Mail,
  Link as LinkIcon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { User } from '../../types';
import { useModal } from '../../hooks/useModal';

interface UserImportData {
  email: string;
  password: string;
  displayName: string;
  role: 'director' | 'admin' | 'purchaser';
  roles?: ('director' | 'admin' | 'purchaser')[];
}

export const UserManagement: React.FC = () => {
  const { userProfile, hasRole } = useAuth();
  const { alertModal, showAlert, closeAlert } = useModal();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<User>>({});
  const [sendingResetEmail, setSendingResetEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as User[];
      
      setUsers(usersList.sort((a, b) => a.displayName.localeCompare(b.displayName)));
    } catch (error) {
      console.error('Error fetching users:', error);
      await showAlert({
        title: 'Error',
        message: 'Error fetching users. Please try again.',
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendPasswordReset = async (userEmail: string, userName: string) => {
    setSendingResetEmail(userEmail);
    try {
      await sendPasswordResetEmail(auth, userEmail);
      
      await showAlert({
        title: 'Password Reset Email Sent',
        message: `A password reset email has been sent to ${userEmail}. ${userName} will receive instructions to reset their password.`,
        variant: 'success'
      });
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      
      let errorMessage = 'Error sending password reset email. Please try again.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = `No user found with email ${userEmail}. The user may not exist in Firebase Authentication.`;
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = `Invalid email address: ${userEmail}`;
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many password reset requests. Please wait before trying again.';
      }
      
      await showAlert({
        title: 'Error',
        message: errorMessage,
        variant: 'error'
      });
    } finally {
      setSendingResetEmail(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const userData: UserImportData[] = JSON.parse(text);

      if (!Array.isArray(userData)) {
        throw new Error('JSON file must contain an array of user objects');
      }

      const validRoles = ['director', 'admin', 'purchaser'];

      // Validate the data structure
      for (let i = 0; i < userData.length; i++) {
        const user = userData[i];
        const userIndex = `User ${i + 1} (${user.email || 'unknown email'})`;

        if (!user.email || !user.password || !user.displayName || !user.role) {
          throw new Error(`${userIndex}: Each user must have email, password, displayName, and role`);
        }

        if (!validRoles.includes(user.role)) {
          throw new Error(`${userIndex}: Primary role "${user.role}" is invalid. Role must be one of: ${validRoles.join(', ')}`);
        }

        if (user.roles) {
          if (!Array.isArray(user.roles)) {
            throw new Error(`${userIndex}: roles field must be an array`);
          }
          
          for (const role of user.roles) {
            // Handle case where role might be a comma-separated string
            if (typeof role === 'string' && role.includes(',')) {
              throw new Error(`${userIndex}: Each role must be a separate array element. Found comma-separated string "${role}". Use separate array elements like ["director", "admin"] instead of ["director, admin"]`);
            }
            
            if (!validRoles.includes(role)) {
              throw new Error(`${userIndex}: Additional role "${role}" is invalid. Roles must be one of: ${validRoles.join(', ')}`);
            }
          }
        }

        if (!user.email.endsWith('@circuitrunners.com')) {
          throw new Error(`${userIndex}: Email must end with @circuitrunners.com`);
        }
      }

      let created = 0;
      let errors: string[] = [];

      for (const userImportData of userData) {
        try {
          // Create user in Firebase Auth
          const userCredential = await createUserWithEmailAndPassword(
            auth, 
            userImportData.email, 
            userImportData.password
          );

          // Create user profile in Firestore
          const userDoc: any = {
            email: userImportData.email,
            displayName: userImportData.displayName,
            role: userImportData.role,
            createdAt: new Date(),
            authMethod: 'email'
          };

          if (userImportData.roles && userImportData.roles.length > 0) {
            userDoc.roles = userImportData.roles;
          }

          await setDoc(doc(db, 'users', userCredential.user.uid), userDoc);

          created++;
        } catch (error: any) {
          errors.push(`${userImportData.email}: ${error.message}`);
        }
      }

      await fetchUsers(); // Refresh the list

      let message = `Successfully created ${created} user${created !== 1 ? 's' : ''}`;
      if (errors.length > 0) {
        message += `\n\nErrors (${errors.length}):\n${errors.slice(0, 5).join('\n')}`;
        if (errors.length > 5) {
          message += `\n... and ${errors.length - 5} more`;
        }
      }

      await showAlert({
        title: 'Import Complete',
        message,
        variant: created > 0 ? 'success' : 'error'
      });

    } catch (error: any) {
      console.error('Error importing users:', error);
      await showAlert({
        title: 'Import Error',
        message: error.message || 'Error importing users. Please check the JSON format.',
        variant: 'error'
      });
    } finally {
      setImporting(false);
      event.target.value = ''; // Reset file input
    }
  };

  const downloadTemplate = () => {
    const template: UserImportData[] = [
      {
        email: "john.doe@circuitrunners.com",
        password: "SecurePassword123!",
        displayName: "John Doe",
        role: "director"
      },
      {
        email: "jane.admin@circuitrunners.com",
        password: "AdminPass456!",
        displayName: "Jane Admin",
        role: "admin",
        roles: ["admin", "purchaser"]
      },
      {
        email: "bob.multi@circuitrunners.com",
        password: "MultiRole789!",
        displayName: "Bob Multi-Role",
        role: "director",
        roles: ["director", "admin"]
      }
    ];

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users-template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setEditData({
      displayName: user.displayName,
      role: user.role,
      roles: user.roles || []
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async (userId: string) => {
    try {
      const updateData: any = {
        displayName: editData.displayName,
        role: editData.role,
        updatedAt: new Date()
      };

      if (editData.roles && editData.roles.length > 0) {
        updateData.roles = editData.roles;
      } else {
        updateData.roles = null; // Remove roles field if empty
      }

      await updateDoc(doc(db, 'users', userId), updateData);

      await fetchUsers();
      setEditingId(null);
      setEditData({});

      await showAlert({
        title: 'Success',
        message: 'User updated successfully',
        variant: 'success'
      });
    } catch (error) {
      console.error('Error updating user:', error);
      await showAlert({
        title: 'Error',
        message: 'Error updating user. Please try again.',
        variant: 'error'
      });
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', userId));
      await fetchUsers();

      await showAlert({
        title: 'Success',
        message: 'User deleted successfully. Note: The user may still exist in Firebase Auth.',
        variant: 'success'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      await showAlert({
        title: 'Error',
        message: 'Error deleting user. Please try again.',
        variant: 'error'
      });
    }
  };

  const getRoleBadges = (user: User) => {
    const allRoles = [user.role];
    if (user.roles) {
      user.roles.forEach(role => {
        if (!allRoles.includes(role)) {
          allRoles.push(role);
        }
      });
    }

    const variants = {
      director: 'info',
      admin: 'success',
      purchaser: 'warning',
      guest: 'default'
    } as const;

    return (
      <div className="flex flex-wrap gap-1">
        {allRoles.map((role, index) => (
          <Badge 
            key={`${role}-${index}`} 
            variant={variants[role as keyof typeof variants] || 'default'}
            size="sm"
          >
            {role.charAt(0).toUpperCase() + role.slice(1)}
            {index === 0 && <span className="ml-1 text-xs opacity-75">(Primary)</span>}
          </Badge>
        ))}
      </div>
    );
  };

  const getAuthMethodBadge = (user: User) => {
    const authMethod = (user as any).authMethod;
    if (authMethod === 'google') {
      return (
        <Badge variant="info" size="sm">
          <svg className="h-3 w-3 mr-1" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </Badge>
      );
    } else if (authMethod === 'email') {
      return (
        <Badge variant="default" size="sm">
          <Mail className="h-3 w-3 mr-1" />
          Email
        </Badge>
      );
    }
    return null;
  };

  const toggleRole = (role: 'director' | 'admin' | 'purchaser') => {
    const currentRoles = editData.roles || [];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    
    setEditData({ ...editData, roles: newRoles });
  };

  if (!hasRole('admin')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-400 text-lg">Access Denied</p>
          <p className="text-gray-500 mt-2">Only administrators can manage users</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-100">User Management</h1>
        <div className="flex space-x-3">
          <input
            id="user-import"
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
            disabled={importing}
          />
          
          <Button 
            variant="outline"
            onClick={downloadTemplate}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          
          <Button 
            onClick={() => document.getElementById('user-import')?.click()}
            disabled={importing} 
            loading={importing}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Users
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Import Instructions & Google Sign-In</CardTitle>
        </CardHeader>
        <div className="space-y-4 text-sm text-gray-300">
          <div>
            <p><strong className="text-gray-200">Authentication Methods:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
              <li><strong>Email/Password:</strong> Traditional sign-in method for bulk user creation</li>
              <li><strong>Google Sign-In:</strong> Users can sign in with their @circuitrunners.com Google account</li>
              <li><strong>Account Linking:</strong> Existing email/password users can link their Google account for convenience</li>
            </ul>
          </div>
          
          <div>
            <p><strong className="text-gray-200">New Google Users:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
              <li>Users signing up with Google for the first time will have <strong>guest role</strong> by default</li>
              <li>Administrators must manually assign proper roles to new Google users</li>
              <li>Only @circuitrunners.com Google accounts are allowed</li>
            </ul>
          </div>

          <div>
            <p><strong className="text-gray-200">JSON Import Format:</strong></p>
            <div className="bg-gray-700 p-4 rounded-lg mt-2">
              <pre className="text-xs text-gray-300 overflow-x-auto">
{`[
  {
    "email": "user@circuitrunners.com",
    "password": "SecurePassword123!",
    "displayName": "User Name",
    "role": "director",
    "roles": ["director", "admin"]
  }
]`}
              </pre>
            </div>
          </div>

          <div>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>email:</strong> Must end with @circuitrunners.com</li>
              <li><strong>password:</strong> Strong password (Firebase requirements apply)</li>
              <li><strong>displayName:</strong> Full name for display</li>
              <li><strong>role:</strong> Primary role - "director", "admin", or "purchaser"</li>
              <li><strong>roles:</strong> (Optional) Array of additional roles for multi-role users</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Users ({users.length})
            </CardTitle>
          </div>
        </CardHeader>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="text-left py-3 px-4 font-medium text-gray-200">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-200">Email</th>
                <th className="text-left py-3 px-4 font-medium text-gray-200">Auth Method</th>
                <th className="text-left py-3 px-4 font-medium text-gray-200">Roles</th>
                <th className="text-left py-3 px-4 font-medium text-gray-200">Created</th>
                <th className="text-center py-3 px-4 font-medium text-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isEditing = editingId === user.id;

                return (
                  <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="py-4 px-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.displayName || ''}
                          onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                          className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100"
                        />
                      ) : (
                        <div className="font-medium text-gray-100">{user.displayName}</div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-gray-300">
                      {user.email}
                    </td>
                    <td className="py-4 px-4">
                      {getAuthMethodBadge(user)}
                    </td>
                    <td className="py-4 px-4">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">Primary Role</label>
                            <select
                              value={editData.role || ''}
                              onChange={(e) => setEditData({ ...editData, role: e.target.value as any })}
                              className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded focus:ring-1 focus:ring-green-500 text-gray-100"
                            >
                              <option value="guest">Guest</option>
                              <option value="director">Director</option>
                              <option value="admin">Admin</option>
                              <option value="purchaser">Purchaser</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">Additional Roles</label>
                            <div className="flex flex-wrap gap-2">
                              {(['director', 'admin', 'purchaser'] as const).map(role => (
                                <button
                                  key={role}
                                  type="button"
                                  onClick={() => toggleRole(role)}
                                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                                    (editData.roles || []).includes(role)
                                      ? 'bg-green-600 border-green-500 text-white'
                                      : 'bg-gray-600 border-gray-500 text-gray-300 hover:bg-gray-500'
                                  }`}
                                >
                                  {role.charAt(0).toUpperCase() + role.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        getRoleBadges(user)
                      )}
                    </td>
                    <td className="py-4 px-4 text-gray-300 text-sm">
                      {user.createdAt.toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            size="sm"
                            onClick={() => saveEdit(user.id)}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEdit}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendPasswordReset(user.email, user.displayName)}
                            loading={sendingResetEmail === user.email}
                            disabled={sendingResetEmail !== null}
                            title="Send password reset email"
                          >
                            <Mail className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteUser(user.id, user.email)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <UserPlus className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No users found</p>
            <p className="text-gray-500 mt-2">Import users from a JSON file to get started</p>
          </div>
        )}
      </Card>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        title={alertModal.options.title}
        message={alertModal.options.message}
        variant={alertModal.options.variant}
      />
    </div>
  );
};