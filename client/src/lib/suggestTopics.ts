import type { RoundType, TopicId } from '@career-log/shared';

/** Keyword → topic hints, matched against the question summary. Order matters only for ties. */
const KEYWORDS: [RegExp, TopicId][] = [
  [/\b(dp|dynamic programming|memo\w*|ways to|subsequence\w*|knapsack|coin change|edit distance)\b/i, 'dp'],
  [/\b(graph|bfs|dfs|shortest path|dijkstra|island|topolog\w*|union.?find|mst|cycle in)\b/i, 'graphs'],
  [/\b(tree|bst|binary tree|lca|ancestor|traversal|trie)\b/i, 'trees'],
  [/\b(array|subarray|matrix|grid|interval)\b/i, 'arrays'],
  [/\b(string|substring|palindrom\w*|anagram\w*|character|word)\b/i, 'strings'],
  [/\b(hash|frequen\w*|duplicate|count distinct)\b/i, 'hashing'],
  [/\b(two pointer|sliding window|window)\b/i, 'two-pointers'],
  [/\b(linked list|node pointer)\b/i, 'linked-list'],
  [/\b(stack|queue|parenthes|histogram|monotonic)\b/i, 'stack-queue'],
  [/\b(heap|priority queue|k (largest|smallest|most)|median|top k)\b/i, 'heap'],
  [/\b(binary search|sorted|rotated|search in)\b/i, 'binary-search'],
  [/\b(greedy|schedul\w*|platform|activity|minimum number of)\b/i, 'greedy'],
  [/\b(recurs\w*|backtrack\w*|permutation\w*|subset|combination|n.?queen|sudoku)\b/i, 'recursion'],
  [/\b(bit|xor)\b/i, 'bit-manipulation'],
  [/\b(prime|gcd|modulo|factorial|number theory)\b/i, 'math'],
  [/\b(sql|query|join|select)\b/i, 'sql'],
  [/\b(dbms|normali[sz]\w*|acid|transaction|index(ing)?|b\+? ?tree|primary key)\b/i, 'dbms'],
  [/\b(os|process|thread|deadlock|paging|virtual memory|semaphore|mutex|scheduling)\b/i, 'os'],
  [/\b(tcp|udp|http|osi|network|dns|ip address|socket)\b/i, 'cn'],
  [/\b(oop|class|inherit\w*|polymorph\w*|encapsul\w*|abstraction\w*|interface)\b/i, 'oops'],
  [/\b(java|c\+\+|python|jvm|garbage collect|pointer|hashmap internals)\b/i, 'language'],
  [/\b(design (a|an)|scal\w*|load balanc|cache|microservice|system design)\b/i, 'system-design'],
  [/\b(lld|low.?level|machine coding|parking lot|class diagram|design pattern)\b/i, 'lld'],
  [/\b(react|api|frontend|backend|web|rest)\b/i, 'web'],
  [/\b(project|resume|internship work)\b/i, 'projects'],
  [/\b(aptitude|percentage|time and work|profit|ratio|speed)\b/i, 'aptitude'],
  [/\b(reasoning|series|blood relation|syllogism)\b/i, 'reasoning'],
  [/\b(puzzle|probability|horses|riddle)\b/i, 'puzzles'],
  [/\b(introduce yourself|why (this|our)|strength|weakness|relocat\w*|salary|where do you see)\b/i, 'hr'],
  [/\b(time (when|you)|conflict|disagree|challenge|leadership|team|deadline|situation)\b/i, 'behavioural'],
];

const BY_ROUND: Record<RoundType, TopicId[]> = {
  'online-assessment': ['arrays', 'strings', 'dp', 'aptitude'],
  coding: ['arrays', 'strings', 'dp', 'graphs', 'trees'],
  technical: ['oops', 'dbms', 'os', 'cn', 'projects'],
  'system-design': ['system-design', 'lld', 'dbms'],
  managerial: ['behavioural', 'projects'],
  hr: ['hr', 'behavioural'],
  'group-discussion': ['behavioural'],
};

/** Up to `limit` likely topics: keyword matches from the summary first, then common ones for the round type. */
export function suggestTopics(summary: string, roundType: RoundType | undefined, exclude: TopicId[], limit = 5): TopicId[] {
  const out: TopicId[] = [];
  const add = (t: TopicId) => {
    if (!exclude.includes(t) && !out.includes(t)) out.push(t);
  };
  for (const [rx, topic] of KEYWORDS) if (rx.test(summary)) add(topic);
  if (roundType) for (const t of BY_ROUND[roundType]) add(t);
  return out.slice(0, limit);
}
