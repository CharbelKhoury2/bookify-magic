import { Story } from '../../utils/types';

export const princessStory: Story = {
  coverTitle: "{{name}}'s Royal Adventure",
  coverSubtitle: "A Magical Tale of Kindness and Courage",
  pages: [
    {
      pageNum: 1,
      text: "Once upon a time, in a castle made of rainbow crystals, lived the kindest royal in all the land—{{name}}! Everyone in the kingdom loved {{name}}'s warm smile and generous heart.",
      hasPhoto: true,
      photoStyle: "circular"
    },
    {
      pageNum: 2,
      text: "One morning, a magical invitation arrived by butterfly mail. The Enchanted Forest was hosting the Grand Fairy Ball, and {{name}} was the guest of honor!",
      hasPhoto: false
    },
    {
      pageNum: 3,
      text: "{{name}} chose the most sparkly outfit and headed to the forest. On the way, {{name}} stopped to help a bunny find its lost carrot and fixed a bird's broken wing with a gentle touch.",
      hasPhoto: true,
      photoStyle: "rectangular"
    },
    {
      pageNum: 4,
      text: "The Fairy Queen was worried—the magical fountain that made flowers bloom had stopped working! 'Only someone with a pure heart can fix it,' she said, looking hopefully at {{name}}.",
      hasPhoto: false
    },
    {
      pageNum: 5,
      text: "{{name}} touched the fountain and whispered words of love and hope. Suddenly, golden light burst forth! Flowers of every color bloomed everywhere, more beautiful than ever before!",
      hasPhoto: true,
      photoStyle: "circular"
    },
    {
      pageNum: 6,
      text: "The Grand Fairy Ball was magnificent! {{name}} danced with fireflies, feasted on rainbow cake, and made friends with creatures from every corner of the magical realm.",
      hasPhoto: false
    },
    {
      pageNum: 7,
      text: "As {{name}} returned home under the starlit sky, the Fairy Queen gifted a magical crown that glowed whenever {{name}} did something kind. And that crown glowed very, very often!",
      hasPhoto: true,
      photoStyle: "rectangular"
    }
  ]
};
