'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { listingsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: string;
}

export default function CreateListingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    type: 'offer' as 'offer' | 'request',
    title: '',
    description: '',
    skills: [] as Skill[],
    location: {
      coordinates: [0, 0] as [number, number],
      address: {
        city: '',
        state: '',
        country: 'USA'
      }
    },
    timeCommitment: 'one-time' as 'one-time' | 'short-term' | 'long-term' | 'ongoing',
    isRemote: false,
    estimatedHours: {
      min: '',
      max: ''
    }
  });

  const [newSkill, setNewSkill] = useState({
    name: '',
    level: 'intermediate' as 'beginner' | 'intermediate' | 'advanced' | 'expert',
    category: 'General'
  });

  // Redirect if not authenticated
  if (!user) {
    router.push('/login');
    return null;
  }

  const handleAddSkill = () => {
    if (newSkill.name.trim()) {
      setFormData({
        ...formData,
        skills: [...formData.skills, { ...newSkill }]
      });
      setNewSkill({ name: '', level: 'intermediate', category: 'General' });
    }
  };

  const handleRemoveSkill = (index: number) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.title.trim() || formData.title.length < 5) {
        throw new Error('Title must be at least 5 characters');
      }
      if (!formData.description.trim() || formData.description.length < 10) {
        throw new Error('Description must be at least 10 characters');
      }
      if (formData.skills.length === 0) {
        throw new Error('Please add at least one skill');
      }
      if (formData.location.coordinates[0] === 0 && formData.location.coordinates[1] === 0) {
        throw new Error('Please enter a valid location');
      }

      // Prepare data for API
      const listingData = {
        type: formData.type,
        title: formData.title,
        description: formData.description,
        skills: formData.skills,
        location: {
          type: 'Point' as const,
          coordinates: formData.location.coordinates,
          address: formData.location.address
        },
        timeCommitment: formData.timeCommitment,
        isRemote: formData.isRemote,
        ...(formData.estimatedHours.min || formData.estimatedHours.max ? {
          estimatedHours: {
            ...(formData.estimatedHours.min ? { min: parseInt(formData.estimatedHours.min) } : {}),
            ...(formData.estimatedHours.max ? { max: parseInt(formData.estimatedHours.max) } : {})
          }
        } : {})
      };

      console.log('Submitting listing:', listingData);
      const response = await listingsApi.create(listingData);
      console.log('Listing created:', response);
      
      // Redirect to the new listing or listings page
      router.push('/listings');
    } catch (err: any) {
      console.error('Error creating listing:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Failed to create listing. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-blue-600">
                SkillMatch
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/listings"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Browse Listings
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold mb-6">Create New Listing</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Listing Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Listing Type *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="offer"
                    checked={formData.type === 'offer'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'offer' })}
                    className="mr-2"
                  />
                  <span className="px-3 py-2 bg-green-100 text-green-800 rounded">
                    Offering a Skill
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="request"
                    checked={formData.type === 'request'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'request' })}
                    className="mr-2"
                  />
                  <span className="px-3 py-2 bg-blue-100 text-blue-800 rounded">
                    Requesting a Skill
                  </span>
                </label>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., JavaScript Tutoring - React & Node.js"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                minLength={5}
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1">5-100 characters</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what you're offering or requesting in detail..."
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                minLength={10}
                maxLength={1000}
              />
              <p className="text-xs text-gray-500 mt-1">10-1000 characters</p>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills * (Add at least one)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  placeholder="Skill name (e.g., JavaScript)"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                />
                <select
                  value={newSkill.level}
                  onChange={(e) => setNewSkill({ ...newSkill, level: e.target.value as any })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full flex items-center gap-2"
                    >
                      {skill.name} ({skill.level})
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(index)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div>
                  <input
                    type="number"
                    step="any"
                    value={formData.location.coordinates[0] || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      location: {
                        ...formData.location,
                        coordinates: [parseFloat(e.target.value) || 0, formData.location.coordinates[1]]
                      }
                    })}
                    placeholder="Longitude"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    step="any"
                    value={formData.location.coordinates[1] || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      location: {
                        ...formData.location,
                        coordinates: [formData.location.coordinates[0], parseFloat(e.target.value) || 0]
                      }
                    })}
                    placeholder="Latitude"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="text"
                  value={formData.location.address.city}
                  onChange={(e) => setFormData({
                    ...formData,
                    location: {
                      ...formData.location,
                      address: { ...formData.location.address, city: e.target.value }
                    }
                  })}
                  placeholder="City"
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  value={formData.location.address.state}
                  onChange={(e) => setFormData({
                    ...formData,
                    location: {
                      ...formData.location,
                      address: { ...formData.location.address, state: e.target.value }
                    }
                  })}
                  placeholder="State"
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  value={formData.location.address.country}
                  onChange={(e) => setFormData({
                    ...formData,
                    location: {
                      ...formData.location,
                      address: { ...formData.location.address, country: e.target.value }
                    }
                  })}
                  placeholder="Country"
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter coordinates (longitude, latitude) or use city/state for approximate location
              </p>
            </div>

            {/* Time Commitment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Commitment
              </label>
              <select
                value={formData.timeCommitment}
                onChange={(e) => setFormData({ ...formData, timeCommitment: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="one-time">One-time</option>
                <option value="short-term">Short-term</option>
                <option value="long-term">Long-term</option>
                <option value="ongoing">Ongoing</option>
              </select>
            </div>

            {/* Estimated Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Hours (Optional)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  value={formData.estimatedHours.min}
                  onChange={(e) => setFormData({
                    ...formData,
                    estimatedHours: { ...formData.estimatedHours, min: e.target.value }
                  })}
                  placeholder="Min hours"
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  value={formData.estimatedHours.max}
                  onChange={(e) => setFormData({
                    ...formData,
                    estimatedHours: { ...formData.estimatedHours, max: e.target.value }
                  })}
                  placeholder="Max hours"
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            {/* Remote Option */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isRemote}
                  onChange={(e) => setFormData({ ...formData, isRemote: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  This can be done remotely
                </span>
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Listing'}
              </button>
              <Link
                href="/listings"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
