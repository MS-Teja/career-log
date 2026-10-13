import { getTopic, type TopicCategory } from '@career-log/shared';

/** One hue per topic category, shared by chips and charts. */
export const CATEGORY_STYLES: Record<TopicCategory, { chip: string; dot: string; cssVar: string }> = {
  dsa: { chip: 'bg-cat-dsa/10 text-cat-dsa border-cat-dsa/25', dot: 'bg-cat-dsa', cssVar: '--cat-dsa' },
  core: { chip: 'bg-cat-core/10 text-cat-core border-cat-core/25', dot: 'bg-cat-core', cssVar: '--cat-core' },
  design: { chip: 'bg-cat-design/10 text-cat-design border-cat-design/25', dot: 'bg-cat-design', cssVar: '--cat-design' },
  aptitude: { chip: 'bg-cat-aptitude/10 text-cat-aptitude border-cat-aptitude/25', dot: 'bg-cat-aptitude', cssVar: '--cat-aptitude' },
  behavioural: {
    chip: 'bg-cat-behavioural/10 text-cat-behavioural border-cat-behavioural/25',
    dot: 'bg-cat-behavioural',
    cssVar: '--cat-behavioural',
  },
};

export function topicInfo(id: string) {
  const t = getTopic(id);
  const category: TopicCategory = t?.category ?? 'dsa';
  return { id, label: t?.label ?? id, category, style: CATEGORY_STYLES[category] };
}
