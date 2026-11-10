// The makes in the Find a Car drop-down: the ones most asked for in Ireland first, then everything else A to Z. A make that is not here
// can still be named in the message.
const POPULAR = ["Toyota", "Volkswagen", "Ford", "Hyundai", "Skoda", "Nissan", "Kia", "BMW", "Audi", "Mercedes-Benz", "Renault", "Peugeot"];
const OTHERS = [
  "Abarth", "Alfa Romeo", "Aston Martin", "Bentley", "Chevrolet", "Chrysler", "Citroën", "Cupra", "Dacia", "DS", "Fiat", "Honda", "Isuzu", "Jaguar", "Jeep", "Land Rover",
  "Lexus", "Lotus", "Maserati", "Mazda", "MG", "Mini", "Mitsubishi", "Opel", "Polestar", "Porsche", "SEAT", "Smart", "SsangYong", "Subaru", "Suzuki", "Tesla", "Vauxhall", "Volvo",
];

export const MAKE_OPTIONS = [
  { value: "", label: "Any make" },
  ...POPULAR.map((m) => ({ value: m, label: m })),
  ...[...OTHERS].sort((a, b) => a.localeCompare(b)).map((m) => ({ value: m, label: m })),
];
