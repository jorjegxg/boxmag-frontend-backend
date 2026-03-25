export type Box = {
  id: number;
  key: string;
  name: string;
  imagePath: string;
};
export type BoxState = {
    isSelected?: boolean;
}

export   type BoxColorOption = {
    id: number;
    key: string;
    name: string;
    imagePath: string;
    isSelected?: boolean;
}

export type CarboardTypeOption = {
    id: number;
    key: string;
    name: string;
    imagePath: string;
};

export type CarboardTypeState = CarboardTypeOption & {
    isSelected?: boolean;
};

export type BoxPrint = {
  id: number;
  key: string;
  name: string;
  isSelected?: boolean;
};


export type TypeOfSize = {
  id: number;
  key: string;
  name: string;
  isSelected?: boolean;

};
export type BoxSize = {
  id: number;
  key: string;
  title: string;
  placeholder: string;
};
export type TransportOption = {
  id: number;
  key: string;
  name: string;
  isSelected?: boolean;
};

