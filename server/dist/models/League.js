"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const LeagueSchema = new mongoose_1.default.Schema({
    name: { type: String },
    img: { type: String },
    numPlayer: { type: String },
    numPlayerForeign: { type: String },
    marketValue: { type: String },
    playerMoreExpensive: { type: String },
    logos: [
        {
            title: { type: String },
            img: { type: String },
        },
    ],
    leagueCode: { type: String },
    topScorers: [
        {
            position: { type: String },
            img: { type: String },
            player: { type: String },
            positionIn: { type: String },
            team: { type: String },
            goals: { type: String },
        },
    ],
    table: [
        {
            position: { type: String },
            img: { type: String },
            team: { type: String },
            games: { type: String },
            win: { type: String },
            draw: { type: String },
            lose: { type: String },
            differenceGoal: { type: String },
            points: { type: String },
        },
    ],
    calendar: [
        {
            title: { type: String },
            tableAllData: [
                {
                    date: { type: String },
                    time: { type: String },
                    localTeam: { type: String },
                    localTeamImg: { type: String },
                    result: { type: String },
                    visitantTeamImg: { type: String },
                    visitantTeam: { type: String },
                },
            ],
        },
    ],
});
exports.default = mongoose_1.default.model("League", LeagueSchema);
