import { create } from "zustand";

type ProjectStore = {
  selectedProjectId: string | null;
  setSelectedProject: (id: string | null) => void;
};

export const useProjectStore = create<ProjectStore>((set) => ({
  selectedProjectId: null,
  setSelectedProject: (id) => set({ selectedProjectId: id }),
}));
