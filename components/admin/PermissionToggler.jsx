'use client';

import { useState } from 'react';
import { Check, X, Clock, Shield, AlertCircle, Calendar } from 'lucide-react';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { Card } from '@/components/ui/Card';

export default function PermissionToggler({ user, permissions, onGrantPermission }) {
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const getUserPermissionStatus = (permissionId) => {
    const userPerm = user.directPermissions?.find(dp => dp.permission.id === permissionId);
    if (!userPerm) return null;
    return userPerm.isGranted;
  };
  
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {});
  
  const categories = ['all', ...Object.keys(groupedPermissions)];
  
  const getFilteredPermissions = () => {
    if (selectedCategory === 'all') {
      return permissions;
    }
    return groupedPermissions[selectedCategory] || [];
  };

  return (
    <Card className="p-6 border-border">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Manage Permissions for {user.firstName} {user.lastName}
            </h2>
            <p className="text-sm text-muted">
              Current Role: <span className="font-medium text-primary">{user.role?.name || 'No role assigned'}</span>
            </p>
          </div>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mt-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
            <p className="text-xs text-muted">
              Direct permissions <strong>override</strong> role permissions. 
              <span className="text-success"> Green</span> = Granted, 
              <span className="text-error"> Red</span> = Denied.
            </p>
          </div>
        </div>
      </div>
      
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-all duration-200 ${
              selectedCategory === category
                ? 'bg-primary text-white'
                : 'bg-muted/10 text-muted hover:bg-muted/20'
            }`}
          >
            {category === 'all' ? 'All Permissions' : category}
          </button>
        ))}
      </div>
      
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {selectedCategory === 'all' ? (
          Object.entries(groupedPermissions).map(([category, perms]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-foreground mb-2 capitalize border-b border-border pb-2">
                {category}
              </h3>
              <div className="space-y-2">
                {perms.map((permission) => {
                  const status = getUserPermissionStatus(permission.id);
                  return (
                    <div key={permission.id} className="flex items-center justify-between p-3 bg-muted/5 rounded-lg hover:bg-muted/10 transition-colors">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{permission.name}</p>
                        <p className="text-xs text-muted">{permission.description}</p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {status !== null && (
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                            status ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                          }`}>
                            {status ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            {status ? 'Granted' : 'Denied'}
                          </span>
                        )}
                        
                        <TooltipWrapper content={status === true ? 'Revoke Permission' : status === false ? 'Remove Deny' : 'Grant Permission'}>
                          <button
                            onClick={() => {
                              const newStatus = status === true ? false : status === false ? null : true;
                              onGrantPermission(
                                user.id, 
                                permission.id, 
                                newStatus === true ? true : false,
                                expiryDate || null
                              );
                            }}
                            className={`p-2 rounded-lg transition-all duration-200 ${
                              status === true ? 'bg-success/10 text-success hover:bg-success/20' :
                              status === false ? 'bg-error/10 text-error hover:bg-error/20' :
                              'bg-muted/10 text-muted hover:bg-primary/10 hover:text-primary'
                            }`}
                          >
                            {status === true ? <Check className="h-4 w-4" /> :
                             status === false ? <X className="h-4 w-4" /> :
                             <Clock className="h-4 w-4" />}
                          </button>
                        </TooltipWrapper>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-2">
            {getFilteredPermissions().map((permission) => {
              const status = getUserPermissionStatus(permission.id);
              return (
                <div key={permission.id} className="flex items-center justify-between p-3 bg-muted/5 rounded-lg hover:bg-muted/10 transition-colors">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{permission.name}</p>
                    <p className="text-xs text-muted">{permission.description}</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {status !== null && (
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                        status ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                      }`}>
                        {status ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {status ? 'Granted' : 'Denied'}
                      </span>
                    )}
                    
                    <TooltipWrapper content={status === true ? 'Revoke Permission' : status === false ? 'Remove Deny' : 'Grant Permission'}>
                      <button
                        onClick={() => {
                          const newStatus = status === true ? false : status === false ? null : true;
                          onGrantPermission(
                            user.id, 
                            permission.id, 
                            newStatus === true ? true : false,
                            expiryDate || null
                          );
                        }}
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          status === true ? 'bg-success/10 text-success hover:bg-success/20' :
                          status === false ? 'bg-error/10 text-error hover:bg-error/20' :
                          'bg-muted/10 text-muted hover:bg-primary/10 hover:text-primary'
                        }`}
                      >
                        {status === true ? <Check className="h-4 w-4" /> :
                         status === false ? <X className="h-4 w-4" /> :
                         <Clock className="h-4 w-4" />}
                      </button>
                    </TooltipWrapper>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="mt-6 pt-4 border-t border-border">
        <label className="block text-sm font-medium text-foreground mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted" />
            Temporary Permission Expiry (Optional)
          </div>
        </label>
        <input
          type="datetime-local"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          className="input-field"
        />
        <p className="text-xs text-muted mt-1">
          Leave empty for permanent permission
        </p>
      </div>
    </Card>
  );
}