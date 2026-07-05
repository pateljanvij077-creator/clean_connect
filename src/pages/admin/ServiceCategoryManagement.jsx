import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { supabase } from '../../supabase/client'
import { formatCurrency } from '../../utils/helpers'
import { Tag, Plus, Edit2, Trash2, X, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function ServiceCategoryManagement() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  // Form states
  const [name, setName] = useState('')
  const [baseRate, setBaseRate] = useState('')
  const [description, setDescription] = useState('')
  
  // Edit states
  const [editingCategory, setEditingCategory] = useState(null)
  const [editName, setEditName] = useState('')
  const [editBaseRate, setEditBaseRate] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('service_categories')
        .select('*')
        .order('name')
      setCategories(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load service categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!name.trim() || !baseRate) return
    setSaving(true)

    try {
      const { error } = await supabase
        .from('service_categories')
        .insert([{
          name: name.trim(),
          base_rate: parseFloat(baseRate),
          description: description.trim()
        }])

      if (error) throw error

      toast.success('Service category created successfully!')
      setName('')
      setBaseRate('')
      setDescription('')
      setShowAddModal(false)
      fetchCategories()
    } catch (err) {
      toast.error(err.message || 'Failed to create category')
    } finally {
      setSaving(false)
    }
  }

  const handleStartEdit = (category) => {
    setEditingCategory(category)
    setEditName(category.name)
    setEditBaseRate(category.base_rate.toString())
    setEditDescription(category.description || '')
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editingCategory || !editName.trim() || !editBaseRate) return
    setSaving(true)

    try {
      const { error } = await supabase
        .from('service_categories')
        .update({
          name: editName.trim(),
          base_rate: parseFloat(editBaseRate),
          description: editDescription.trim()
        })
        .eq('id', editingCategory.id)

      if (error) throw error

      toast.success('Category updated successfully!')
      setEditingCategory(null)
      fetchCategories()
    } catch (err) {
      toast.error('Failed to update category')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async (id, catName) => {
    const confirm = window.confirm(`Are you sure you want to delete "${catName}"? This will remove it from the catalog.`)
    if (!confirm) return

    try {
      const { error } = await supabase
        .from('service_categories')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Service category deleted successfully')
      fetchCategories()
    } catch (err) {
      toast.error('Failed to delete category')
    }
  }

  return (
    <AdminLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Service Catalog Configurator</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Configure active cleaning service types, base rates, and descriptions
            </p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ gap: '4px' }}>
            <Plus size={16} /> Add Category
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" />
          </div>
        ) : categories.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Tag size={28} style={{ margin: '0 auto 0.5rem' }} />
            <p>No service categories configured yet.</p>
          </div>
        ) : (
          <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {categories.map(c => (
              <div key={c.id} className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                
                {editingCategory?.id === c.id ? (
                  <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)' }}>Edit Category</h4>
                    
                    <div className="form-group" style={{ margin: 0 }}>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={editName} 
                        onChange={e => setEditName(e.target.value)} 
                        placeholder="Service Name"
                        required 
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <input 
                        type="number" 
                        step="0.01"
                        className="form-input" 
                        value={editBaseRate} 
                        onChange={e => setEditBaseRate(e.target.value)} 
                        placeholder="Base Price (INR)"
                        required 
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <textarea 
                        className="form-input" 
                        value={editDescription} 
                        onChange={e => setEditDescription(e.target.value)} 
                        placeholder="Description..."
                        style={{ minHeight: '60px', resize: 'vertical' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <button type="button" onClick={() => setEditingCategory(null)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                        <X size={12} /> Cancel
                      </button>
                      <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1 }} disabled={saving}>
                        <Check size={12} /> Save
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ fontWeight: 800, fontSize: '1.1rem' }}>{c.name}</h4>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {c.id.substring(0, 8)}...</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                          onClick={() => handleStartEdit(c)} 
                          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px' }}
                          title="Edit Service"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteCategory(c.id, c.name)} 
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                          title="Delete Service"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recommended Base Fare</span>
                      <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--success)', marginTop: '2px' }}>
                        {formatCurrency(c.base_rate)}<span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>/hr</span>
                      </h3>
                    </div>

                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.4, flex: 1 }}>
                      {c.description || 'No description added for this service.'}
                    </p>
                  </>
                )}

              </div>
            ))}
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: '1.5rem', backdropFilter: 'blur(8px)'
          }}>
            <form onSubmit={handleAddCategory} className="card glass slide-up" style={{ maxWidth: '440px', width: '100%', gap: '1rem' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Add Service Category</h3>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-ghost btn-sm" style={{ padding: 0 }}>
                  <X size={20} />
                </button>
              </div>
              
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Service Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Deep Sanitization" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Recommended Base Price (INR/hr)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="form-input" 
                  placeholder="e.g. 249" 
                  value={baseRate} 
                  onChange={e => setBaseRate(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Description</label>
                <textarea 
                  className="form-input" 
                  placeholder="Provide details about what this cleaning service includes..." 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  style={{ minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
