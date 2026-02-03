import { Story } from '../../utils/types';
import { cosmicJourney } from './cosmicJourney';
import { zooExplorer } from './zooExplorer';
import { dragonQuest } from './dragonQuest';
import { princessStory } from './princessStory';
import { championSpirit } from './championSpirit';
import { toothFairy } from './toothFairy';

export const STORIES: Record<string, Story> = {
  cosmic_journey: cosmicJourney,
  zoo_explorer: zooExplorer,
  dragon_quest: dragonQuest,
  princess_story: princessStory,
  champion_spirit: championSpirit,
  tooth_fairy: toothFairy
};

export function getStoryByThemeId(themeId: string): Story | undefined {
  return STORIES[themeId];
}

export function personalizeStory(story: Story, childName: string): Story {
  const personalizedPages = story.pages.map(page => ({
    ...page,
    text: page.text.replace(/\{\{name\}\}/g, childName)
  }));

  return {
    coverTitle: story.coverTitle.replace(/\{\{name\}\}/g, childName),
    coverSubtitle: story.coverSubtitle.replace(/\{\{name\}\}/g, childName),
    pages: personalizedPages
  };
}
