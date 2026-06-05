import { create } from "zustand";

export type BusinessOrderDraft = {
  length: string;
  width: string;
  height: string;
  quantity: string;
  message: string;
  attachmentName: string;
  attachmentBase64: string;
  attachmentMimeType: string;
  acceptedTerms: boolean;
};

type BusinessOrderStore = {
  draft: BusinessOrderDraft;
  setDraft: (draft: BusinessOrderDraft) => void;
  resetDraft: () => void;
};

const emptyDraft: BusinessOrderDraft = {
  length: "",
  width: "",
  height: "",
  quantity: "",
  message: "",
  attachmentName: "",
  attachmentBase64: "",
  attachmentMimeType: "",
  acceptedTerms: false,
};

const useBusinessOrderStore = create<BusinessOrderStore>((set) => ({
  draft: emptyDraft,
  setDraft: (draft) => set({ draft }),
  resetDraft: () => set({ draft: emptyDraft }),
}));

export default useBusinessOrderStore;

