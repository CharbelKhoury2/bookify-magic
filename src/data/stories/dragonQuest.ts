import { Story } from '../../utils/types';

export const dragonQuest: Story = {
  coverTitle: "{{name}}'s Dragon Quest",
  coverSubtitle: "A Brave Adventure in the Enchanted Kingdom",
  pages: [
    {
      pageNum: 1,
      text: "In a land of castles and magic, there lived a young hero named {{name}}. The villagers whispered of a lonely dragon in the mountains who needed a friend. {{name}} decided to find out the truth!",
      hasPhoto: true,
      photoStyle: "circular"
    },
    {
      pageNum: 2,
      text: "{{name}} packed a bag with sandwiches and cookies, grabbed a wooden sword, and set off on the journey. The path wound through sparkling meadows and whispering forests.",
      hasPhoto: false
    },
    {
      pageNum: 3,
      text: "Along the way, {{name}} helped a lost fairy find her way home and shared cookies with a hungry troll. 'You're the kindest traveler I've ever met!' said the troll gratefully.",
      hasPhoto: true,
      photoStyle: "rectangular"
    },
    {
      pageNum: 4,
      text: "At the mountain's peak, {{name}} found Ember the Dragon, crying rainbow tears. 'Everyone runs away before they know me,' Ember sniffled. {{name}} sat down and said, 'I'd like to be your friend.'",
      hasPhoto: false
    },
    {
      pageNum: 5,
      text: "Ember's scales sparkled with joy! The dragon wasn't scary at all—just misunderstood. {{name}} and Ember played hide-and-seek among the clouds and toasted marshmallows with dragon fire.",
      hasPhoto: true,
      photoStyle: "circular"
    },
    {
      pageNum: 6,
      text: "{{name}} brought Ember to meet the village. At first, everyone was scared. But when they saw the dragon's gentle smile and {{name}}'s bravery, they welcomed their new friend with open arms!",
      hasPhoto: false
    },
    {
      pageNum: 7,
      text: "From that day on, Ember became the village's guardian, and {{name}} was celebrated as the bravest hero the kingdom had ever known. But {{name}} knew the real treasure was friendship.",
      hasPhoto: true,
      photoStyle: "rectangular"
    }
  ]
};
