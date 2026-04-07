'use client';

import { useState } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function RoleManager({ roles, permissions, onCreateRole, onUpdateRole, onDeleteRole }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissionIds: []
  });

  const handleSubmit = () => {
    if (editingRole) {
      onUpdateRole({ ...formData, id: editingRole.id });
    } else {
      onCreateRole(formData);
    }
    resetForm();
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingRole(null);
    setFormData({ name: '', description: '', permissionIds: [] });
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissionIds: role.permissions.map(rp => rp.permission.id)
    });
    setIsEditing(true);
  };

  const togglePermission = (permissionId) => {
    setFormData(prev => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter(id => id !== permissionId)
        : [...prev.permissionIds, permissionId]
    }));
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Role Creation/Edit Form */}
      {isEditing && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {editingRole ? 'Edit Role' : 'Create New Role'}
            </h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder="e.g., ANALYST"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
                rows="2"
                placeholder="Role description..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 capitalize">{category}</h3>
                    <div className="space-y-2">
                      {perms.map((perm) => (
                        <label key={perm.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.permissionIds.includes(perm.id)}
                            onChange={() => togglePermission(perm.id)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700">{perm.name}</span>
                          <span className="text-xs text-gray-500">- {perm.description}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleSubmit}>
                <Save className="h-4 w-4 mr-2" />
                {editingRole ? 'Update Role' : 'Create Role'}
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      {/* Roles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <Card key={role.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{role.description}</p>
              </div>
              <div className="flex gap-2">
                {!role.isSystem && (
                  <>
                    <TooltipWrapper content="Edit Role">
                      <button
                        onClick={() => handleEdit(role)}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </TooltipWrapper>
                    <TooltipWrapper content="Delete Role">
                      <button
                        onClick={() => onDeleteRole(role.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TooltipWrapper>
                  </>
                )}
              </div>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Users: {role._count?.users || 0}
              </p>
              <div className="flex flex-wrap gap-1">
                {role.permissions.slice(0, 5).map((rp) => (
                  <span key={rp.permission.id} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                    {rp.permission.name}
                  </span>
                ))}
                {role.permissions.length > 5 && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                    +{role.permissions.length - 5} more
                  </span>
                )}
              </div>
            </div>
          </Card>
        ))}
        
        {/* Add Role Card */}
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
          >
            <div className="flex flex-col items-center gap-2">
              <Plus className="h-8 w-8 text-gray-400" />
              <span className="text-sm text-gray-600">Create New Role</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}