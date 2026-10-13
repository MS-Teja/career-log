export const TOPIC_CATEGORIES = ['dsa', 'core', 'design', 'aptitude', 'behavioural'] as const;
export type TopicCategory = (typeof TOPIC_CATEGORIES)[number];

export const TOPIC_CATEGORY_LABELS: Record<TopicCategory, string> = {
  dsa: 'Data structures & algorithms',
  core: 'CS fundamentals',
  design: 'Design & development',
  aptitude: 'Aptitude',
  behavioural: 'Behavioural',
};

export const TOPICS = [
  { id: 'arrays', label: 'Arrays', category: 'dsa' },
  { id: 'strings', label: 'Strings', category: 'dsa' },
  { id: 'hashing', label: 'Hashing', category: 'dsa' },
  { id: 'two-pointers', label: 'Two pointers / sliding window', category: 'dsa' },
  { id: 'linked-list', label: 'Linked list', category: 'dsa' },
  { id: 'stack-queue', label: 'Stack & queue', category: 'dsa' },
  { id: 'trees', label: 'Trees', category: 'dsa' },
  { id: 'graphs', label: 'Graphs', category: 'dsa' },
  { id: 'dp', label: 'Dynamic programming', category: 'dsa' },
  { id: 'greedy', label: 'Greedy', category: 'dsa' },
  { id: 'binary-search', label: 'Binary search', category: 'dsa' },
  { id: 'recursion', label: 'Recursion & backtracking', category: 'dsa' },
  { id: 'heap', label: 'Heap / priority queue', category: 'dsa' },
  { id: 'bit-manipulation', label: 'Bit manipulation', category: 'dsa' },
  { id: 'math', label: 'Math & number theory', category: 'dsa' },
  { id: 'dbms', label: 'DBMS', category: 'core' },
  { id: 'sql', label: 'SQL', category: 'core' },
  { id: 'os', label: 'Operating systems', category: 'core' },
  { id: 'cn', label: 'Computer networks', category: 'core' },
  { id: 'oops', label: 'OOP', category: 'core' },
  { id: 'language', label: 'Language internals (Java/C++/Python)', category: 'core' },
  { id: 'system-design', label: 'System design', category: 'design' },
  { id: 'lld', label: 'Low-level design', category: 'design' },
  { id: 'web', label: 'Web development', category: 'design' },
  { id: 'projects', label: 'Projects / resume', category: 'design' },
  { id: 'aptitude', label: 'Quantitative aptitude', category: 'aptitude' },
  { id: 'reasoning', label: 'Logical reasoning', category: 'aptitude' },
  { id: 'puzzles', label: 'Puzzles', category: 'aptitude' },
  { id: 'hr', label: 'HR', category: 'behavioural' },
  { id: 'behavioural', label: 'Behavioural / situational', category: 'behavioural' },
] as const satisfies readonly { id: string; label: string; category: TopicCategory }[];

export type TopicId = (typeof TOPICS)[number]['id'];

export const TOPIC_IDS = TOPICS.map((t) => t.id) as [TopicId, ...TopicId[]];

const topicById = new Map<string, (typeof TOPICS)[number]>(TOPICS.map((t) => [t.id, t]));

export function getTopic(id: string) {
  return topicById.get(id);
}
