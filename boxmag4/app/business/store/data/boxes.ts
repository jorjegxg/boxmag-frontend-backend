import { Box, BoxColorOption, BoxPrint, BoxSize, CarboardTypeOption, TransportOption, TypeOfSize } from "./types";

const boxes: Box[] = [
  {
    id: 1,
    key: "ecommerce_boxes_fefco_703",
    name: "Boxfix, E-commerce Boxes Fefco 703 - B Wave",
    imagePath: "/b2b/boxes/ecommerce.png",
  },
  {
    id: 2,
    key: "flaps_box_fefco_201",
    name: "Flaps Box - Fefco 201",
    imagePath: "/b2b/boxes/flaps_box.png",
  },
  {
    id: 3,
    key: "shipping_box_with_tape_and_tear_strip_fefco_427",
    name: "Shipping Box With Tape And Tear Strip - Fefco 427 (Size: 343X245X47 mm) - B Wave",
    imagePath: "/b2b/boxes/tear_strip.png",
  },
  {
    id: 4,
    key: "shipping_box_fefco_427",
    name: "Shipping Box - Fefco 427 (Size: 343X245X47 mm) - B Wave",
    imagePath: "/b2b/boxes/felco.png",
  },
  {
    id: 5,
    key: "footwear_shipping_box_boxfix",
    name: "Footwear shipping box - Boxfix (Size: 350x255x135 mm) - B Wave",
    imagePath: "/b2b/boxes/footwear.png",
  },
  {
    id: 6,
    key: "flat_box",
    name: "Flat Box (Size: 220x155x39 mm, A5 - DIN)",
    imagePath: "/b2b/boxes/flat_box.png",
  },
  {
    id: 7,
    key: "pizza_box",
    name: "Pizza Box (Size: 325x325x39mm) - E Wave",
    imagePath: "/b2b/boxes/pizza.png",
  },
  {
    id: 8,
    key: "height_adjustable_shipping_box",
    name: "Height Adjustable Shipping Box - Fefco 710, B Wave",
    imagePath: "/b2b/boxes/adjustable.png",
  },
];

const carboarbonTypeOptions: CarboardTypeOption[] = [
  { id: 1, key: "b_wave", name: "B Wave", imagePath: "/b2b/carboard_types/b_wave.svg" },
  { id: 2, key: "c_wave", name: "C Wave", imagePath: "/b2b/carboard_types/c_wave.svg" },
  { id: 3, key: "e_wave", name: "E Wave", imagePath: "/b2b/carboard_types/e_wave.svg" },
];

const boxColorOptions: BoxColorOption[] = [
    { id: 1, key: "brown_on_both_side", name: "Brown On Both Side", imagePath: "/b2b/carboard_colors/brown_on_both_sides.svg" },
    { id: 2, key: "white_on_both_side", name: "White On Both Side", imagePath: "/b2b/carboard_colors/white_on_both_sides.svg" },
    { id: 3, key: "white_outside_brown_inside", name: "White Outside Brown Inside", imagePath: "/b2b/carboard_colors/whote_outside_brown_inside.svg" },
];
const boxPrintOptions : BoxPrint[] = [
  { id: 1, key: "no_color", name: "No Color" },
  { id: 2, key: "one_color", name: "1 Color" },
  { id: 3, key: "two_colors", name: "2 Colors" },
  { id: 4, key: "three_colors", name: "3 Colors" },
];

const typeOfSizes : TypeOfSize[] = [
  { id: 1, key: "internal", name: "Internal Size - mm" },
  { id: 2, key: "external", name: "External Size - mm" }
]

const boxSizes : BoxSize[] = [
  { id: 1, key: "length", title: "Length (mm)", placeholder: "Enter Package Length (mm)" },
  { id: 2, key: "width", title: "Width (mm)", placeholder: "Enter Package Width (mm)" },
  { id: 3, key: "height", title: "Height (mm)", placeholder: "Enter Package Height (mm)" },
];

const transportOptions : TransportOption[] = [
  { id: 1, key: "own", name: "Own" },
  { id: 2, key: "carrier", name: "Carrier" },
];


export { boxes, boxColorOptions, carboarbonTypeOptions, boxPrintOptions, typeOfSizes, boxSizes, transportOptions };