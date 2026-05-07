export const SRI_LANKA_DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo',
  'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara',
  'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar',
  'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya',
  'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya',
];

// District centroids and mock size factors based on land area
export const DISTRICT_METADATA = {
  'Ampara': { center: [7.2912, 81.6724], size_factor: 1.5 },
  'Anuradhapura': { center: [8.3114, 80.4102], size_factor: 1.8 },
  'Badulla': { center: [6.9934, 81.0550], size_factor: 1.2 },
  'Batticaloa': { center: [7.7302, 81.6924], size_factor: 1.3 },
  'Colombo': { center: [6.9271, 79.8612], size_factor: 0.8 },
  'Galle': { center: [6.0535, 80.2170], size_factor: 1.0 },
  'Gampaha': { center: [7.0840, 79.9865], size_factor: 0.9 },
  'Hambantota': { center: [6.1246, 81.1220], size_factor: 1.3 },
  'Jaffna': { center: [9.6615, 80.0074], size_factor: 1.1 },
  'Kalutara': { center: [6.5854, 79.9607], size_factor: 1.0 },
  'Kandy': { center: [7.2906, 80.6337], size_factor: 1.2 },
  'Kegalle': { center: [7.2513, 80.3487], size_factor: 1.0 },
  'Kilinochchi': { center: [9.3803, 80.3982], size_factor: 1.1 },
  'Kurunegala': { center: [7.4863, 80.3647], size_factor: 1.4 },
  'Mannar': { center: [8.9810, 79.9044], size_factor: 1.3 },
  'Matale': { center: [7.4675, 80.6234], size_factor: 1.2 },
  'Matara': { center: [5.9549, 80.5483], size_factor: 1.0 },
  'Monaragala': { center: [6.8704, 81.3507], size_factor: 1.6 },
  'Mullaitivu': { center: [9.2671, 80.8136], size_factor: 1.4 },
  'Nuwara Eliya': { center: [6.9497, 80.7718], size_factor: 1.1 },
  'Polonnaruwa': { center: [7.9403, 81.0036], size_factor: 1.4 },
  'Puttalam': { center: [8.0330, 79.8283], size_factor: 1.4 },
  'Ratnapura': { center: [6.6828, 80.4037], size_factor: 1.3 },
  'Trincomalee': { center: [8.5711, 81.2335], size_factor: 1.3 },
  'Vavuniya': { center: [8.7542, 80.4982], size_factor: 1.2 }
};

export const generateMockData = () => {
  return SRI_LANKA_DISTRICTS.map(district => {
    const demand = Math.floor(Math.random() * 500) + 100;
    const supply = Math.random() > 0.4 
      ? Math.floor(Math.random() * (demand * 0.74)) 
      : Math.floor(demand * (0.75 + Math.random() * 0.5));
    
    return {
      district,
      demand,
      supply,
      percentage: (supply / demand) * 100
    };
  });
};
