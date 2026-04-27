import { stat } from "fs";
import { create } from "zustand";
import { Box, BoxColorOption, BoxPrint, BoxSize, BoxState, CarboardTypeState, TransportOption, TypeOfSize } from "./data/types";
import { boxColorOptions, boxes, boxPrintOptions, boxSizes, carboarbonTypeOptions, transportOptions, typeOfSizes } from "./data/boxes";

export type PageWithState = Box & BoxState;
const isDevelopment = process.env.NODE_ENV === "development";

type BusinessState = {
    boxes: PageWithState[];
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

const useBusinessStore = create<BusinessState>((set, get) => ({
    boxes: boxes.map((box, index) => ({ ...box, isSelected: isDevelopment ? index === 0 : false })),
    confirmBox(id) {
        set((state) => ({
            boxes: state.boxes.map((box) => box.id === id ? { ...box, isSelected: true } : { ...box, isSelected: false })
        }));
    },

    carboarbonTypeOptions: carboarbonTypeOptions.map((option, index) => ({
        ...option,
        isSelected: isDevelopment ? index === 0 : option.isSelected,
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