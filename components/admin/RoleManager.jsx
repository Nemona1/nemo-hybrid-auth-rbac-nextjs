'use client';

import { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, Shield, Users, Key, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function RoleManager({ roles, permissions, onCreateRole, onUpdateRole, onDeleteRole }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissionIds: []
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Role name is required');
      return;
    }
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

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
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
        <Card className="p-6 border-border">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </h2>
              <p className="text-sm text-muted mt-1">
                {editingRole ? 'Modify role details and permissions' : 'Define a new role with specific permissions'}
              </p>
            </div>
            <button onClick={resetForm} className="p-2 rounded-lg hover:bg-muted/10 transition-colors">
              <X className="h-5 w-5 text-muted" />
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Role Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="e.g., ANALYST"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Display Name</label>
                <input
                  type="text"
                  value={formData.name}
                  className="input-field bg-muted/20"
                  placeholder="Will be displayed in uppercase"
                  disabled
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
                rows="2"
                placeholder="Describe the responsibilities and access level of this role..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">Permissions</label>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <div key={category} className="border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-3 bg-muted/5 hover:bg-muted/10 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground capitalize">{category}</span>
                        <span className="text-xs text-muted">({perms.length} permissions)</span>
                      </div>
                      {expandedCategories[category] ? (
                        <ChevronUp className="h-4 w-4 text-muted" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted" />
                      )}
                    </button>
                    {expandedCategories[category] && (
                      <div className="p-3 space-y-2 border-t border-border">
                        {perms.map((perm) => (
                          <label key={perm.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.permissionIds.includes(perm.id)}
                              onChange={() => togglePermission(perm.id)}
                              className="mt-0.5 rounded border-border text-primary focus:ring-primary"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">{perm.name}</p>
                              <p className="text-xs text-muted">{perm.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex gap-3 justify-end pt-4 border-t border-border">
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
          <Card key={role.id} className="p-6 border-border hover:shadow-lg transition-all duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{role.name}</h3>
                  <p className="text-sm text-muted mt-0.5">{role.description || 'No description'}</p>
                </div>
              </div>
              {!role.isSystem && (
                <div className="flex gap-1">
                  <TooltipWrapper content="Edit Role">
                    <button
                      onClick={() => handleEdit(role)}
                      className="p-1.5 rounded-lg hover:bg-primary/10 text-muted hover:text-primary transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </TooltipWrapper>
                  <TooltipWrapper content="Delete Role">
                    <button
                      onClick={() => onDeleteRole(role.id)}
                      className="p-1.5 rounded-lg hover:bg-error/10 text-muted hover:text-error transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TooltipWrapper>
                </div>
              )}
            </div>
            
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Users className="h-4 w-4" />
                  <span>{role._count?.users || 0} user{role._count?.users !== 1 ? 's' : ''} assigned</span>
                </div>
                <span className="text-xs text-muted">
                  {role.permissions?.length || 0} permission{role.permissions?.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(role.permissions || []).slice(0, 4).map((rp) => (
                  <span key={rp.permission.id} className="px-2 py-1 text-xs bg-muted/10 text-muted rounded-md">
                    {rp.permission.name}
                  </span>
                ))}
                {(role.permissions || []).length > 4 && (
                  <span className="px-2 py-1 text-xs bg-muted/10 text-muted rounded-md">
                    +{(role.permissions || []).length - 4} more
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
            className="border-2 border-dashed border-border rounded-xl p-6 hover:border-primary hover:bg-primary/5 transition-all duration-200 group"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-muted/10 group-hover:bg-primary/10 transition-colors flex items-center justify-center">
                <Plus className="h-6 w-6 text-muted group-hover:text-primary transition-colors" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Create New Role</p>
                <p className="text-xs text-muted mt-1">Define custom role with permissions</p>
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}