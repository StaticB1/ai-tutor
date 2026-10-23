// Sample items for the public demo. All are original, written by Statotech Systems for this repo;
// none come from ZIMSEC or Cambridge past papers. A school's real item bank stays in its own system.

import type { Item } from "@/lib/tutor/types";

export const ITEMS: Item[] = [
  {
    id: "maths-linear-equation",
    subject: "Mathematics",
    level: "Form 2",
    topic: "Linear equations",
    question: "Solve $3(x - 4) = 2x + 5$.",
    marks: 3,
    markingPoints: [
      { id: "M1", text: "Expands the bracket correctly: $3x - 12$" },
      { id: "M2", text: "Collects the x terms and the numbers on opposite sides, e.g. $3x - 2x = 5 + 12$" },
      { id: "A1", text: "$x = 17$", answer: true },
    ],
    workedSolution: ["Expand the bracket: $3x - 12 = 2x + 5$.", "Subtract $2x$ from both sides and add 12 to both sides: $3x - 2x = 5 + 12$.", "So $x = 17$."],
    finalAnswer: { kind: "number", value: 17 },
    misconceptions: [
      { id: "bracket-first-term", description: "Multiplies only the first term in the bracket, writing $3x - 4$.", nudge: "When the 3 multiplies the bracket, which terms inside does it multiply?" },
      { id: "sign-change", description: "Moves $-12$ across without changing its sign, getting $x = 5 - 12 = -7$.", nudge: "If you take $-12$ away from one side, what must you do to the other side to keep it balanced?" },
    ],
    hints: [
      "Start with the left side. What do you get when you multiply out $3(x - 4)$?",
      "Try to get all the $x$ terms on one side and all the plain numbers on the other. What could you subtract from both sides?",
    ],
  },
  {
    id: "maths-successive-discount",
    subject: "Mathematics",
    level: "Form 3",
    topic: "Percentages",
    question: "A school bag costs US\\$40. The shop reduces the price by 15%. In a later sale, the new price is reduced by a further 10%. Find the final price.",
    marks: 3,
    markingPoints: [
      { id: "M1", text: "Finds the price after the first reduction: US$34" },
      { id: "M2", text: "Applies the 10% to the new price (US$34), not to US$40" },
      { id: "A1", text: "US$30.60", answer: true },
    ],
    workedSolution: ["15% of US\\$40 is US\\$6, so the first sale price is US\\$34.", "10% of US\\$34 is US\\$3.40.", "The final price is US\\$34 − US\\$3.40 = US\\$30.60."],
    finalAnswer: { kind: "number", value: 30.6, tolerance: 0.005 },
    misconceptions: [
      { id: "add-percentages", description: "Adds the two reductions to make 25% off US$40, getting US$30.", nudge: "The second 10% is taken off which price: the original one, or the price after the first sale?" },
      { id: "answer-is-discount", description: "Gives the amount taken off instead of the price paid.", nudge: "Is the number you found the money taken off, or what the customer pays?" },
    ],
    hints: ["What is 15% of US\\$40? What does the bag cost after that first reduction?", "The second reduction is 10% of the new price. What is 10% of that price?"],
  },
  {
    id: "maths-pythagoras-ladder",
    subject: "Mathematics",
    level: "Form 4",
    topic: "Pythagoras' theorem",
    question: "A ladder 5 m long leans against a vertical wall. The foot of the ladder is 1.4 m from the wall on level ground. How high up the wall does the ladder reach?",
    marks: 3,
    markingPoints: [
      { id: "M1", text: "Recognises a right-angled triangle with the ladder as the hypotenuse" },
      { id: "M2", text: "Writes $h^2 = 5^2 - 1.4^2$ (or $h^2 = 23.04$)" },
      { id: "A1", text: "$h = 4.8$ m", answer: true },
    ],
    workedSolution: ["The wall, the ground and the ladder make a right-angled triangle; the ladder is the hypotenuse.", "$h^2 + 1.4^2 = 5^2$, so $h^2 = 25 - 1.96 = 23.04$.", "$h = \\sqrt{23.04} = 4.8$ m."],
    finalAnswer: { kind: "number", value: 4.8, tolerance: 0.01, unit: "m" },
    misconceptions: [
      { id: "adds-squares", description: "Adds the squares ($25 + 1.96$) as if the ladder were a shorter side.", nudge: "Which side of the triangle is the longest, and where does it go in Pythagoras' theorem?" },
      { id: "no-square-root", description: "Stops at $h^2 = 23.04$ and gives 23.04 m as the height.", nudge: "Is 23.04 the height, or the height squared? Could a 5 m ladder reach that high?" },
    ],
    hints: ["Draw it. The wall, the ground and the ladder make what kind of triangle? Which side is the ladder?", "Pythagoras: (short side)² + (short side)² = (longest side)². Which sides do you know?"],
  },
  {
    id: "science-photosynthesis",
    subject: "Combined Science",
    level: "Form 2",
    topic: "Photosynthesis",
    question: "Write the word equation for photosynthesis, and name two conditions a plant needs for it to happen.",
    marks: 4,
    markingPoints: [
      { id: "R", text: "Reactants: carbon dioxide and water", leak: ["carbon dioxide", "CO2"] },
      { id: "P", text: "Products: glucose (or sugar/starch accepted) and oxygen", leak: ["glucose"] },
      { id: "C1", text: "Light (sunlight) as a condition" },
      { id: "C2", text: "Chlorophyll as a condition", leak: ["chlorophyll"] },
    ],
    workedSolution: ["Plants take in carbon dioxide from the air and water from the soil.", "They make glucose and release oxygen.", "carbon dioxide + water → glucose + oxygen, which needs light and chlorophyll."],
    misconceptions: [
      { id: "oxygen-in", description: "Puts oxygen as a reactant, confusing photosynthesis with respiration.", nudge: "Which gas do plants take in from the air to make food, and which do they give out?" },
      { id: "soil-food", description: "Says plants get their food from the soil.", nudge: "What does the plant actually take from the soil, and where is the food made?" },
    ],
    hints: ["Think about what a plant takes in: one thing comes in through the leaves from the air, and one through the roots.", "What does the plant make, and what gas does it give out that we breathe?", "Why can't photosynthesis happen at night? And what makes leaves green?"],
  },
  {
    id: "physics-average-speed",
    subject: "Physics",
    level: "Form 3",
    topic: "Speed",
    question: "A minibus travels 150 km from Harare in 2.5 hours. Calculate its average speed in km/h.",
    marks: 2,
    markingPoints: [
      { id: "M1", text: "Uses speed = distance ÷ time" },
      { id: "A1", text: "60 km/h", answer: true },
    ],
    workedSolution: ["Average speed = distance ÷ time.", "150 ÷ 2.5 = 60 km/h."],
    finalAnswer: { kind: "number", value: 60, unit: "km/h" },
    misconceptions: [
      { id: "multiplies", description: "Multiplies distance by time (375).", nudge: "If you drive for longer to cover the same distance, should your speed go up or down?" },
      { id: "inverts", description: "Divides time by distance (about 0.017).", nudge: "km/h means kilometres per hour. Which number should be on top of the division?" },
    ],
    hints: ["What does 'km/h' tell you about how to work out speed?", "Speed is distance divided by time. What are the distance and the time here?"],
  },
  {
    id: "geography-soil-erosion",
    subject: "Geography",
    level: "Form 3",
    topic: "Land degradation",
    question: "Give three ways farmers in communal areas can reduce soil erosion on sloping land.",
    marks: 3,
    pointsNeeded: 3,
    markingPoints: [
      { id: "contour", text: "Contour ploughing or contour ridges" },
      { id: "terrace", text: "Terracing" },
      { id: "trees", text: "Planting trees, agroforestry or keeping vegetation cover" },
      { id: "cover", text: "Cover crops or mulching" },
      { id: "grazing", text: "Controlling stock numbers or rotational grazing to stop overgrazing" },
      { id: "gully", text: "Filling gullies, stone lines or check dams" },
      { id: "strip", text: "Strip cropping" },
    ],
    workedSolution: ["Slow down water running down the slope: contour ridges, terraces, stone lines.", "Keep the soil covered: trees, cover crops, mulch.", "Any three such as contour ridges, terracing and controlled grazing."],
    misconceptions: [
      { id: "more-fertiliser", description: "Suggests adding fertiliser, which improves fertility but does not hold soil in place.", nudge: "Fertiliser helps crops grow. Does it stop rain water from carrying soil down the slope?" },
    ],
    hints: ["Erosion on a slope happens when rain water runs fast downhill. How could a farmer slow that water down?", "Bare soil washes away easily. How could the soil be kept covered?", "Cattle and goats can strip a hillside. What could farmers do about the animals?"],
  },
  {
    id: "history-great-zimbabwe-decline",
    subject: "History",
    level: "Form 2",
    topic: "Great Zimbabwe",
    question: "Explain two reasons why the Great Zimbabwe state declined.",
    marks: 4,
    pointsNeeded: 2,
    markingPoints: [
      { id: "resources", text: "Too many people and cattle for the area: soil, grazing land and firewood were used up" },
      { id: "trade", text: "Trade (gold and ivory) moved north, so the state lost wealth" },
      { id: "drought", text: "Drought and shortage of food or salt" },
      { id: "succession", text: "Disputes over succession or political splits, with groups moving away" },
    ],
    workedSolution: ["Historians link the decline to pressure on the land and to changes in trade.", "Growth used up soil, grazing and firewood, and trade routes moved north.", "Any two such as exhaustion of resources and the shift of trade."],
    misconceptions: [
      { id: "colonial", description: "Blames European colonisers, who arrived centuries after the decline.", nudge: "When did Great Zimbabwe decline, and when did Europeans arrive in the area?" },
    ],
    hints: ["Think about a big town that keeps growing for a long time. What happens to the land, grass and firewood around it?", "Great Zimbabwe grew rich from trade. What would happen if that trade moved somewhere else?"],
  },
  {
    id: "english-personification",
    subject: "English Language",
    level: "Form 2",
    topic: "Figures of speech",
    question: "Identify the figure of speech in this sentence and explain its effect: “The wind whispered through the msasa trees.”",
    marks: 3,
    markingPoints: [
      { id: "name", text: "Names it as personification", answer: true, leak: ["personification", "personify", "personified"] },
      { id: "how", text: "Explains that the wind is given a human action (whispering)" },
      { id: "effect", text: "Explains the effect: a soft, quiet or calm mood, or makes the scene feel alive" },
    ],
    workedSolution: ["Wind cannot really whisper; only people can.", "Giving a human action to something that is not human is personification.", "It is personification, and it creates a soft, calm, gentle mood."],
    finalAnswer: { kind: "text", accept: ["personification", "personify", "personifies", "personified"] },
    misconceptions: [
      { id: "simile", description: "Calls it a simile, though there is no 'like' or 'as'.", nudge: "A simile compares using 'like' or 'as'. Can you find either word in the sentence?" },
      { id: "onomatopoeia", description: "Calls it onomatopoeia because whispering is a sound.", nudge: "Does the word 'whispered' imitate the wind's sound, or describe something a person does?" },
    ],
    hints: ["Can wind really whisper? Who usually whispers?", "When writers give human actions to things that are not human, what is that called?"],
  },
  {
    id: "accounts-equation",
    subject: "Principles of Accounting",
    level: "Form 3",
    topic: "The accounting equation",
    question: "A tuck-shop has assets of US\\$12 000 and liabilities of US\\$4 500. Calculate the owner's capital.",
    marks: 2,
    markingPoints: [
      { id: "M1", text: "Uses capital = assets − liabilities" },
      { id: "A1", text: "US$7 500", answer: true },
    ],
    workedSolution: ["Assets = capital + liabilities, so capital = assets − liabilities.", "Capital = 12 000 − 4 500 = US\\$7 500."],
    finalAnswer: { kind: "number", value: 7500 },
    misconceptions: [
      { id: "adds", description: "Adds assets and liabilities (16 500).", nudge: "Liabilities are money the business owes to others. Does that belong to the owner?" },
    ],
    hints: ["What does the accounting equation say about assets, liabilities and capital?", "If the business sold every asset and paid off everything it owes, what would be left for the owner?"],
  },
  {
    id: "computing-denary-binary",
    subject: "Computer Science",
    level: "Form 3",
    topic: "Number systems",
    question: "Convert the denary number 37 to binary.",
    marks: 2,
    markingPoints: [
      { id: "M1", text: "A valid method: repeated division by 2 with remainders, or place values 32 + 4 + 1" },
      { id: "A1", text: "100101", answer: true },
    ],
    workedSolution: ["Place values: 32, 16, 8, 4, 2, 1.", "37 = 32 + 4 + 1, so put a 1 under 32, 4 and 1.", "37 in binary is 100101."],
    finalAnswer: { kind: "text", accept: ["100101"] },
    misconceptions: [
      { id: "reversed", description: "Reads the remainders top to bottom, getting 101001.", nudge: "When you divide by 2 repeatedly, which remainder gives the 1s place: the first one or the last one?" },
    ],
    hints: ["Write the binary place values: 32, 16, 8, 4, 2, 1. Which is the biggest one that fits into 37?", "After taking 32 away, what is left? Which place values make that up?"],
  },
];

export function getItem(id: string): Item | undefined {
  return ITEMS.find((i) => i.id === id);
}
