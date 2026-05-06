const mongoose = require('mongoose');

const MLDataSchema = new mongoose.Schema({
    Date: { type: String, required: true },
    Category: { type: String, required: true },
    District: { type: String, required: true },
    Month: Number,
    Day: Number,
    DayOfWeek: Number,
    Is_Holiday: Number,
    Is_Long_Weekend: Number,
    Is_Rainy: Number,
    Is_Sunny: Number,
    Sunny_Days_Consecutive: { type: Number, default: 0 },
    Rainy_Days_Consecutive: { type: Number, default: 0 },
    Special_Event: Number,
    Demand_Count: { type: Number, default: 1 } // හැමතිස්සෙම 1 ලෙස සේව් වේ
});

module.exports = mongoose.model('Service_Data_For_CSV', MLDataSchema);