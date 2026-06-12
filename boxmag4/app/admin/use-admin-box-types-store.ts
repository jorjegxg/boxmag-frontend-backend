"use client";

import { create } from "zustand";

export type AdminBoxType = {
  id: number;
  title: string;
  images: Array<{
    id: number;
    url: string;
    sortOrder: number;
    altText: string | null;
    isPrimary: boolean;
  }>;
  isActive: boolean;
};

function sortBoxTypesActiveFirst(boxTypes: AdminBoxType[]): AdminBoxType[] {
  return [...boxTypes].sort((a, b) => {
    if (a.isActive !== b.isActive) {
      return Number(b.isActive) - Number(a.isActive);
    }
    return a.id - b.id;
  });
}

type EditableBoxType = Pick<AdminBoxType, "title" | "images" | "isActive">;

type AdminBoxTypesState = {
  backendBaseUrl: string;
  boxTypes: AdminBoxType[];
  isLoadingBoxTypes: boolean;
  boxTypesError: string | null;
  editingBoxId: number | null;
  editingData: EditableBoxType | null;
  isSavingBoxType: boolean;
  saveError: string | null;
  statusUpdatingBoxId: number | null;
  setBackendBaseUrl: (value: string) => void;
  loadBoxTypes: () => Promise<void>;
  createBoxType: (payload: {
    title: string;
    images: AdminBoxType["images"];
    isActive?: boolean;
  }) => Promise<void>;
  startEditing: (boxType: AdminBoxType) => void;
  cancelEditing: () => void;
  updateEditingTitle: (value: string) => void;
  updateEditingStatus: (isActive: boolean) => void;
  saveEditedBoxType: () => Promise<void>;
  deactivateBoxType: (boxTypeId: number) => Promise<void>;
  activateBoxType: (boxTypeId: number) => Promise<void>;
};

export const useAdminBoxTypesStore = create<AdminBoxTypesState>((set, get) => ({
  backendBaseUrl: "http://localhost:3005",
  boxTypes: [],
  isLoadingBoxTypes: true,
  boxTypesError: null,
  editingBoxId: null,
  editingData: null,
  isSavingBoxType: false,
  saveError: null,
  statusUpdatingBoxId: null,

  setBackendBaseUrl: (value) => {
    set({ backendBaseUrl: value });
  },

  loadBoxTypes: async () => {
    set({ isLoadingBoxTypes: true, boxTypesError: null });
    try {
      const response = await fetch(`${get().backendBaseUrl}/api/box-types`);
      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`);
      }
      const payload = (await response.json()) as {
        ok: boolean;
        data?: AdminBoxType[];
        message?: string;
      };
      if (!payload.ok || !Array.isArray(payload.data)) {
        throw new Error(payload.message ?? "Invalid response payload");
      }

      set({
        boxTypes: sortBoxTypesActiveFirst(payload.data),
        isLoadingBoxTypes: false,
      });
    } catch (error) {
      set({
        boxTypesError:
          error instanceof Error
            ? error.message
            : "Nu s-au putut încărca tipurile de cutii",
        isLoadingBoxTypes: false,
      });
    }
  },

  createBoxType: async (payload) => {
    const backendBaseUrl = get().backendBaseUrl;
    set({ isSavingBoxType: true, saveError: null });
    try {
      const response = await fetch(`${backendBaseUrl}/api/box-types`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: payload.title,
          images: payload.images,
          isActive: payload.isActive ?? true,
        }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        data?: AdminBoxType;
        message?: string;
      };
      if (!response.ok || body.ok !== true || !body.data) {
        throw new Error(body.message ?? `Failed with status ${response.status}`);
      }

      set((state) => ({
        boxTypes: sortBoxTypesActiveFirst([
          ...state.boxTypes,
          body.data as AdminBoxType,
        ]),
        isSavingBoxType: false,
        saveError: null,
      }));
    } catch (error) {
      set({
        saveError:
          error instanceof Error
            ? error.message
            : "Nu s-a putut crea tipul de cutie",
        isSavingBoxType: false,
      });
    }
  },

  startEditing: (boxType) => {
    set({
      editingBoxId: boxType.id,
      editingData: {
        title: boxType.title,
        images: boxType.images,
        isActive: boxType.isActive,
      },
      saveError: null,
    });
  },

  cancelEditing: () => {
    set({
      editingBoxId: null,
      editingData: null,
      saveError: null,
    });
  },

  updateEditingTitle: (value) => {
    set((state) => {
      if (!state.editingData) return state;
      return {
        editingData: {
          ...state.editingData,
          title: value,
        },
      };
    });
  },

  updateEditingStatus: (isActive) => {
    set((state) => {
      if (!state.editingData) return state;
      return {
        editingData: {
          ...state.editingData,
          isActive,
        },
      };
    });
  },

  saveEditedBoxType: async () => {
    const { editingBoxId, editingData, backendBaseUrl } = get();
    if (editingBoxId == null || !editingData) return;

    set({ isSavingBoxType: true, saveError: null });
    try {
      const response = await fetch(`${backendBaseUrl}/api/box-types/${editingBoxId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editingData),
      });
      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.message ?? `Failed with status ${response.status}`);
      }

      set((state) => ({
        boxTypes: sortBoxTypesActiveFirst(
          state.boxTypes.map((boxType) =>
            boxType.id === editingBoxId
              ? {
                  ...boxType,
                  title: editingData.title,
                  images: editingData.images,
                  isActive: editingData.isActive,
                }
              : boxType
          ),
        ),
        isSavingBoxType: false,
        editingBoxId: null,
        editingData: null,
        saveError: null,
      }));

    } catch (error) {
      set({
        saveError:
          error instanceof Error
            ? error.message
            : "Nu s-a putut actualiza tipul de cutie",
        isSavingBoxType: false,
      });
    }
  },

  deactivateBoxType: async (boxTypeId) => {
    const backendBaseUrl = get().backendBaseUrl;
    set({ statusUpdatingBoxId: boxTypeId, saveError: null });
    try {
      const response = await fetch(`${backendBaseUrl}/api/box-types/${boxTypeId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.message ?? `Failed with status ${response.status}`);
      }

      set((state) => ({
        boxTypes: sortBoxTypesActiveFirst(
          state.boxTypes.map((boxType) =>
            boxType.id === boxTypeId ? { ...boxType, isActive: false } : boxType
          ),
        ),
        statusUpdatingBoxId: null,
        saveError: null,
      }));
    } catch (error) {
      set({
        saveError:
          error instanceof Error
            ? error.message
            : "Nu s-a putut dezactiva tipul de cutie",
        statusUpdatingBoxId: null,
      });
      throw error;
    }
  },

  activateBoxType: async (boxTypeId) => {
    const backendBaseUrl = get().backendBaseUrl;
    set({ statusUpdatingBoxId: boxTypeId, saveError: null });
    try {
      const response = await fetch(
        `${backendBaseUrl}/api/box-types/${boxTypeId}/activate`,
        { method: "POST" },
      );
      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.message ?? `Failed with status ${response.status}`);
      }

      set((state) => ({
        boxTypes: sortBoxTypesActiveFirst(
          state.boxTypes.map((boxType) =>
            boxType.id === boxTypeId ? { ...boxType, isActive: true } : boxType
          ),
        ),
        statusUpdatingBoxId: null,
        saveError: null,
      }));
    } catch (error) {
      set({
        saveError:
          error instanceof Error
            ? error.message
            : "Nu s-a putut activa tipul de cutie",
        statusUpdatingBoxId: null,
      });
      throw error;
    }
  },
}));
