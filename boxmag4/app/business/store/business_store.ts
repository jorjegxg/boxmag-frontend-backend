import { create } from "zustand";
import { Box, BoxColorOption, BoxPrint, BoxSize, BoxState, CarboardTypeState, TransportOption, TypeOfSize } from "./data/types";
import { boxColorOptions, boxPrintOptions, boxSizes, carboarbonTypeOptions, transportOptions, typeOfSizes } from "./data/boxes";

export type PageWithState = Box & BoxState;
const publicAppEnv = process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase();
const effectiveEnv =
    publicAppEnv === "development" ||
    publicAppEnv === "production" ||
    publicAppEnv === "dev"
        ? publicAppEnv
        : "unknown";
const isDevelopment = effectiveEnv === "development" || effectiveEnv === "dev";

type BusinessState = {
    boxes: PageWithState[];
    isLoadingBoxes: boolean;
    boxesError: string | null;
    loadBoxes: (backendBaseUrl: string) => Promise<void>;
    confirmBox: (id: number) => void;

    carboarbonTypeOptions: CarboardTypeState[];
    confirmCarboardTypeOption: (id: number) => void;

    boxColorOptions: BoxColorOption[];
    confirmBoxColorOption: (id: number) => void;

    boxPrintOptions: BoxPrint[];
    confirmBoxPrintOption: (id: number) => void;

    typeOfSizes: TypeOfSize[];
    confirmTypeOfSize: (id: number) => void;

    boxSizes: BoxSize[];
    confirmBoxSize: (id: number) => void;

    transportOptions: TransportOption[];
    confirmTransportOption: (id: number) => void;
};

const useBusinessStore = create<BusinessState>((set) => ({
    boxes: [],
    isLoadingBoxes: true,
    boxesError: null,
    async loadBoxes(backendBaseUrl) {
        set({ isLoadingBoxes: true, boxesError: null });
        try {
            const response = await fetch(`${backendBaseUrl}/api/box-types`);
            const payload = (await response.json()) as {
                ok?: boolean;
                data?: Array<{ id: number; title: string; imagePath: string; isActive: boolean }>;
                message?: string;
            };
            if (!response.ok || payload.ok !== true || !Array.isArray(payload.data)) {
                throw new Error(payload.message ?? `Failed with status ${response.status}`);
            }

            const mappedBoxes: PageWithState[] = payload.data
                .filter((box) => box.isActive)
                .map((box, index) => ({
                    id: box.id,
                    key: String(box.id),
                    name: box.title,
                    imagePath: box.imagePath,
                    isSelected: isDevelopment ? index === 0 : false,
                }));

            set({ boxes: mappedBoxes, isLoadingBoxes: false, boxesError: null });
        } catch (error) {
            set({
                isLoadingBoxes: false,
                boxesError: error instanceof Error ? error.message : "Failed to load boxes",
            });
        }
    },
    confirmBox(id) {
        set((state) => ({
            boxes: state.boxes.map((box) => box.id === id ? { ...box, isSelected: true } : { ...box, isSelected: false })
        }));
    },

    carboarbonTypeOptions: carboarbonTypeOptions.map((option, index) => ({
        ...option,
        isSelected: isDevelopment ? index === 0 : false,
    })),
    confirmCarboardTypeOption(id) {
        console.log("confirmCarboardTypeOption ", id);
        set((state) => ({
            carboarbonTypeOptions: state.carboarbonTypeOptions.map((option) => 
                option.id === id ? { ...option, isSelected: true } : { ...option, isSelected: false })
        }));
    },
  
    boxColorOptions: boxColorOptions.map((option, index) => ({ ...option, isSelected: isDevelopment ? index === 0 : false })),
    confirmBoxColorOption(id) {
        console.log("confirmBoxColorOption ", id);
        set((state) => ({
            boxColorOptions: state.boxColorOptions.map((option) => option.id === id ? { ...option, isSelected: true } : { ...option, isSelected: false })
        }));
    },

    boxPrintOptions: boxPrintOptions.map((option, index) => ({ ...option, isSelected: isDevelopment ? index === 0 : false })),
    confirmBoxPrintOption(id) {
        console.log("confirmBoxPrintOption ", id);
        set((state) => ({
            boxPrintOptions: state.boxPrintOptions.map((option) => option.id === id ? { ...option, isSelected: true } : { ...option, isSelected: false })
        }));
    },

    typeOfSizes: typeOfSizes.map((option, index) => ({ ...option, isSelected: isDevelopment ? index === 0 : false })),
    confirmTypeOfSize(id) {
        console.log("confirmTypeOfSize ", id);
        set((state) => ({
            typeOfSizes: state.typeOfSizes.map((option) => option.id === id ? { ...option, isSelected: true } : { ...option, isSelected: false })
        }));
    },


    boxSizes: boxSizes.map((option, index) => ({ ...option, isSelected: isDevelopment ? index === 0 : false })),
    confirmBoxSize(id) {
        console.log("confirmBoxSize ", id);
        set((state) => ({
            boxSizes: state.boxSizes.map((option) => option.id === id ? { ...option, isSelected: true } : { ...option, isSelected: false })
        }));
    },


    transportOptions: transportOptions.map((option, index) => ({...option , isSelected : isDevelopment ? index === 0 : false})),
    confirmTransportOption: (id) => {
        set((state) => ({
            transportOptions: state.transportOptions.map((option) => option.id === id ? ({...option, isSelected : true}) : ({...option, isSelected : false})  )
        }));
    }
}));

export default useBusinessStore;