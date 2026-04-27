"use client";

import { create } from "zustand";

export type AdminBoxType = {
  id: number;
  key: string;
  title: string;
  imagePath: string;
  isActive: boolean;
};

type EditableBoxType = Pick<AdminBoxType, "title" | "imagePath" | "isActive"> & {
  imageFile: File | null;
  previewImagePath: string;
};

type AdminBoxTypesState = {
  backendBaseUrl: string;
  boxTypes: AdminBoxType[];
  isLoadingBoxTypes: boolean;
  boxTypesError: string | null;
  editingBoxId: number | null;
  editingData: EditableBoxType | null;
  isSavingBoxType: boolean;
  saveError: string | null;
  setBackendBaseUrl: (value: string) => void;
  loadBoxTypes: () => Promise<void>;
  createBoxType: (payload: {
    key: string;
    title: string;
    imagePath: string;
    isActive?: boolean;
  }) => Promise<void>;
  startEditing: (boxType: AdminBoxType) => void;
  cancelEditing: () => void;
  updateEditingTitle: (value: string) => void;
  updateEditingStatus: (isActive: boolean) => void;
  updateEditingImageFile: (file: File | null) => void;
  saveEditedBoxType: () => Promise<void>;
};

function revokePreviewIfNeeded(path?: string) {
  if (path?.startsWith("blob:")) {
    URL.revokeObjectURL(path);
  }
}

export const useAdminBoxTypesStore = create<AdminBoxTypesState>((set, get) => ({
  backendBaseUrl: "http://localhost:3005",
  boxTypes: [],
  isLoadingBoxTypes: true,
  boxTypesError: null,
  editingBoxId: null,
  editingData: null,
  isSavingBoxType: false,
  saveError: null,

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
        boxTypes: payload.data,
        isLoadingBoxTypes: false,
      });
    } catch (error) {
      set({
        boxTypesError: error instanceof Error ? error.message : "Failed to load box types",
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
          key: payload.key,
          title: payload.title,
          imagePath: payload.imagePath,
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
        boxTypes: [...state.boxTypes, body.data as AdminBoxType],
        isSavingBoxType: false,
        saveError: null,
      }));
    } catch (error) {
      set({
        saveError: error instanceof Error ? error.message : "Failed to create box type",
        isSavingBoxType: false,
      });
    }
  },

  startEditing: (boxType) => {
    const debugStart = performance.now();
    const currentPreview = get().editingData?.previewImagePath;
    // #region agent log
    fetch("http://127.0.0.1:7337/ingest/001632f5-f360-4660-a740-ac305c61ac19", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "52d9a7",
      },
      body: JSON.stringify({
        sessionId: "52d9a7",
        runId: "pre-fix",
        hypothesisId: "H3",
        location: "use-admin-box-types-store.ts:startEditing:entry",
        message: "startEditing invoked",
        data: {
          boxTypeId: boxType.id,
          boxCount: get().boxTypes.length,
          hadBlobPreview: Boolean(currentPreview?.startsWith("blob:")),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    revokePreviewIfNeeded(currentPreview);
    set({
      editingBoxId: boxType.id,
      editingData: {
        title: boxType.title,
        imagePath: boxType.imagePath,
        isActive: boxType.isActive,
        imageFile: null,
        previewImagePath: boxType.imagePath,
      },
      saveError: null,
    });
    // #region agent log
    fetch("http://127.0.0.1:7337/ingest/001632f5-f360-4660-a740-ac305c61ac19", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "52d9a7",
      },
      body: JSON.stringify({
        sessionId: "52d9a7",
        runId: "pre-fix",
        hypothesisId: "H3",
        location: "use-admin-box-types-store.ts:startEditing:exit",
        message: "startEditing completed",
        data: {
          boxTypeId: boxType.id,
          durationMs: Number((performance.now() - debugStart).toFixed(2)),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  },

  cancelEditing: () => {
    const currentPreview = get().editingData?.previewImagePath;
    revokePreviewIfNeeded(currentPreview);
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

  updateEditingImageFile: (file) => {
    set((state) => {
      if (!state.editingData) return state;

      revokePreviewIfNeeded(state.editingData.previewImagePath);

      if (!file) {
        return {
          editingData: {
            ...state.editingData,
            imageFile: null,
            previewImagePath: state.editingData.imagePath,
          },
        };
      }

      return {
        editingData: {
          ...state.editingData,
          imageFile: file,
          previewImagePath: URL.createObjectURL(file),
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
        boxTypes: state.boxTypes.map((boxType) =>
          boxType.id === editingBoxId
            ? {
                ...boxType,
                title: editingData.title,
                imagePath: editingData.imagePath,
                isActive: editingData.isActive,
              }
            : boxType
        ),
        isSavingBoxType: false,
        editingBoxId: null,
        editingData: null,
        saveError: null,
      }));

      revokePreviewIfNeeded(editingData.previewImagePath);
    } catch (error) {
      set({
        saveError: error instanceof Error ? error.message : "Failed to update box type",
        isSavingBoxType: false,
      });
    }
  },
}));
