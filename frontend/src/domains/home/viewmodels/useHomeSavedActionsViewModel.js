import { useEffect, useState } from 'react';
import apiClient from '../../../shared/infra/http/apiClient';
import { STORAGE_KEYS } from '../../../shared/infra/storage/storageKeys';
import { loadJSON, saveJSON } from '../../../shared/infra/storage/storageService';

export function useHomeSavedActionsViewModel(savedPosts, setSavedPosts) {
  const [savedCollections, setSavedCollections] = useState([{ id: 'default', name: 'Mặc định' }]);
  const [savedPostCollectionMap, setSavedPostCollectionMap] = useState({});
  const [saveCollectionModalPostId, setSaveCollectionModalPostId] = useState(null);
  const [saveCollectionChoice, setSaveCollectionChoice] = useState('default');
  const [newSaveCollectionName, setNewSaveCollectionName] = useState('');

  useEffect(() => {
    const rawCollections = loadJSON(STORAGE_KEYS.savedCollections, null);
    const rawMap = loadJSON(STORAGE_KEYS.savedCollectionMap, {});
    if (Array.isArray(rawCollections) && rawCollections.length > 0) {
      const hasDefault = rawCollections.some((c) => c?.id === 'default');
      setSavedCollections(hasDefault ? rawCollections : [{ id: 'default', name: 'Mặc định' }, ...rawCollections]);
    }
    if (rawMap && typeof rawMap === 'object') {
      setSavedPostCollectionMap(rawMap);
    }
  }, []);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.savedCollections, savedCollections);
  }, [savedCollections]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.savedCollectionMap, savedPostCollectionMap);
  }, [savedPostCollectionMap]);

  const toggleSave = async (postId) => {
    const newSaved = new Set(savedPosts);
    if (newSaved.has(postId)) {
      await apiClient.delete(`/posts/${postId}/save`);
      newSaved.delete(postId);
      setSavedPostCollectionMap((prev) => {
        if (!Object.prototype.hasOwnProperty.call(prev, String(postId))) return prev;
        const next = { ...prev };
        delete next[String(postId)];
        return next;
      });
    } else {
      await apiClient.post(`/posts/${postId}/save`);
      newSaved.add(postId);
      setSavedPostCollectionMap((prev) => ({
        ...prev,
        [String(postId)]: prev[String(postId)] || 'default'
      }));
    }
    setSavedPosts(newSaved);
  };

  const openSaveToCollectionModal = (postId) => {
    const pid = String(postId);
    if (savedPosts.has(pid) || savedPosts.has(postId)) {
      toggleSave(postId);
      return;
    }
    setSaveCollectionModalPostId(pid);
    setSaveCollectionChoice(savedPostCollectionMap[pid] || 'default');
    setNewSaveCollectionName('');
  };

  const createSaveCollectionInModal = () => {
    const name = newSaveCollectionName.trim();
    if (!name) return { ok: false, reason: 'empty' };
    const exists = savedCollections.some((c) => (c.name || '').toLowerCase() === name.toLowerCase());
    if (exists) return { ok: false, reason: 'duplicate' };
    const id = `col_${Date.now()}`;
    setSavedCollections((prev) => [...prev, { id, name }]);
    setSaveCollectionChoice(id);
    setNewSaveCollectionName('');
    return { ok: true };
  };

  const confirmSaveToCollection = async () => {
    if (!saveCollectionModalPostId) return;
    const postId = String(saveCollectionModalPostId);
    await apiClient.post(`/posts/${postId}/save`);
    setSavedPosts((prev) => {
      const next = new Set(prev);
      next.add(postId);
      return next;
    });
    setSavedPostCollectionMap((prev) => ({
      ...prev,
      [postId]: saveCollectionChoice || 'default'
    }));
    setSaveCollectionModalPostId(null);
    setSaveCollectionChoice('default');
    setNewSaveCollectionName('');
  };

  return {
    savedCollections,
    saveCollectionModalPostId,
    setSaveCollectionModalPostId,
    saveCollectionChoice,
    setSaveCollectionChoice,
    newSaveCollectionName,
    setNewSaveCollectionName,
    toggleSave,
    openSaveToCollectionModal,
    createSaveCollectionInModal,
    confirmSaveToCollection
  };
}
