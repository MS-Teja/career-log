/** Demo data shared by `npm run seed` and the API tests. */
import bcrypt from 'bcryptjs';
import type { Difficulty, ExperienceStatus, QuestionInput, RoundInput, RoundResult, RoundType } from '@career-log/shared';
import { allowedDomains, env } from '../config/env';
import { Company, slugify } from '../models/Company';
import { Experience } from '../models/Experience';
import { Otp } from '../models/Otp';
import { User } from '../models/User';

const domain = allowedDomains[0] ?? 'college.edu';

const q = (summary: string, topics: QuestionInput['topics'], difficulty?: Difficulty, approach?: string): QuestionInput => ({
  summary,
  topics,
  difficulty,
  approach,
});
const r = (
  type: RoundType,
  difficulty: Difficulty,
  result: RoundResult,
  questions: QuestionInput[],
  extra: Partial<RoundInput> = {},
): RoundInput => ({ type, difficulty, result, questions, ...extra });

const COMPANIES = [
  ['Amazon', ['amazon india', 'aws']],
  ['Microsoft', ['msft']],
  ['Google', ['alphabet']],
  ['Goldman Sachs', ['gs']],
  ['Flipkart', []],
  ['Atlassian', []],
  ['Oracle', []],
  ['Zoho', ['zoho corp']],
  ['Deloitte', ['deloitte usi']],
  ['TCS', ['tata consultancy services']],
  ['Infosys', []],
  ['Accenture', []],
] as const;

export async function seedDatabase({ reset }: { reset: boolean }) {
  if (reset) {
    await Promise.all([User.deleteMany({}), Company.deleteMany({}), Experience.deleteMany({}), Otp.deleteMany({})]);
  } else if ((await Experience.estimatedDocumentCount()) > 0 || (await User.estimatedDocumentCount()) > 0) {
    return null;
  }
  await Promise.all([Experience.syncIndexes(), User.syncIndexes()]);

  const pw = (s: string) => bcrypt.hash(s, 10);
  const adminEmail = (env.ADMIN_EMAIL ?? `admin@${domain}`).toLowerCase();
  const adminPassword = env.ADMIN_PASSWORD ?? 'Admin@12345';

  const admin = await User.create({
    name: 'Placement Cell',
    email: adminEmail,
    passwordHash: await pw(adminPassword),
    role: 'admin',
    branch: 'Training & Placement',
    isVerified: true,
  });

  const seniorPw = await pw('Senior@12345');
  const seniorData = [
    ['Ananya Rao', 'CSE'],
    ['Rahul Verma', 'CSE'],
    ['Sneha Iyer', 'IT'],
    ['Karthik Reddy', 'ECE'],
    ['Meera Nair', 'CSE'],
  ] as const;
  const seniors = await User.insertMany(
    seniorData.map(([name, branch], i) => ({
      name,
      email: `${name.split(' ')[0]!.toLowerCase()}@${domain}`,
      passwordHash: seniorPw,
      role: 'senior',
      branch,
      gradYear: i < 3 ? 2025 : 2024,
      isVerified: true,
      seniorRequest: { status: 'approved', note: 'Seeded senior', decidedAt: new Date() },
    })),
  );
  const [ananya, rahul, sneha, karthik, meera] = seniors as [(typeof seniors)[number], ...typeof seniors];

  const junior = await User.create({
    name: 'Arjun Mehta',
    email: `junior@${domain}`,
    passwordHash: await pw('Junior@12345'),
    role: 'junior',
    branch: 'CSE',
    gradYear: 2027,
    isVerified: true,
  });

  // A pending request so the admin Users tab has something to review.
  await User.create({
    name: 'Priya Shah',
    email: `priya@${domain}`,
    passwordHash: await pw('Junior@12345'),
    role: 'junior',
    branch: 'IT',
    gradYear: 2025,
    isVerified: true,
    seniorRequest: { status: 'pending', note: 'Placed at Infosys (SP role) in the 2025 drive, happy to share.', requestedAt: new Date() },
  });

  const companies = await Company.insertMany(COMPANIES.map(([name, aliases]) => ({ name, slug: slugify(name), aliases: [...aliases] })));
  const co = (name: string) => companies.find((c) => c.name === name)!;

  type Seed = {
    author: (typeof seniors)[number];
    company: string;
    role: string;
    year: number;
    ctcRange?: string;
    offerType: 'full-time' | 'internship' | 'internship-ppo';
    overallResult: 'selected' | 'rejected' | 'waitlisted' | 'awaiting';
    isAnonymous?: boolean;
    tips?: string;
    rounds: RoundInput[];
    status?: ExperienceStatus;
    rejectionReason?: string;
    upvotes?: number;
  };

  const seeds: Seed[] = [
    {
      author: ananya,
      company: 'Amazon',
      role: 'SDE-1',
      year: 2025,
      ctcRange: '44 LPA',
      offerType: 'full-time',
      overallResult: 'selected',
      upvotes: 4,
      tips: 'Amazon cares a lot about Leadership Principles. Prepare 2 STAR stories per principle and practice explaining your thought process out loud before writing code.',
      rounds: [
        r(
          'online-assessment',
          'medium',
          'cleared',
          [
            q(
              'Count ways to climb stairs with variable step sizes and blocked steps',
              ['dp', 'arrays'],
              'medium',
              '1-D DP, skip blocked indices',
            ),
            q('Find the k most frequent product IDs in a log stream', ['hashing', 'heap'], 'medium', 'Hash map + min-heap of size k'),
          ],
          { durationMins: 105, description: '2 coding questions + work-style survey on HackerRank.' },
        ),
        r(
          'coding',
          'medium',
          'cleared',
          [
            q(
              'Minimum cost path in a grid with obstacles',
              ['dp', 'graphs'],
              'medium',
              'Started with BFS, interviewer nudged towards DP since moves were only right/down',
            ),
            q('Tell me about a time you disagreed with a teammate', ['behavioural'], 'easy'),
          ],
          { durationMins: 60 },
        ),
        r(
          'coding',
          'hard',
          'cleared',
          [
            q('Longest increasing path in a matrix', ['dp', 'graphs', 'recursion'], 'hard', 'DFS with memoisation'),
            q('Design an LRU cache', ['linked-list', 'hashing', 'lld'], 'medium'),
          ],
          { durationMins: 60 },
        ),
        r(
          'managerial',
          'medium',
          'cleared',
          [
            q('Deep dive into final-year project; why MongoDB over Postgres?', ['projects', 'dbms']),
            q('Leadership principle questions: Ownership and Dive Deep', ['behavioural']),
          ],
          { durationMins: 45, description: 'Bar raiser round.' },
        ),
      ],
    },
    {
      author: rahul,
      company: 'Amazon',
      role: 'SDE Intern',
      year: 2025,
      ctcRange: '1.1 L/month',
      offerType: 'internship-ppo',
      overallResult: 'selected',
      isAnonymous: true,
      upvotes: 3,
      tips: 'The OA is the biggest filter. Do the Amazon-tagged problems on LeetCode from the last 6 months.',
      rounds: [
        r(
          'online-assessment',
          'medium',
          'cleared',
          [
            q('Maximum sum subarray after at most one deletion', ['dp', 'arrays'], 'medium'),
            q('Group anagrams from a list of search queries', ['strings', 'hashing'], 'easy'),
          ],
          { durationMins: 90 },
        ),
        r(
          'coding',
          'medium',
          'cleared',
          [
            q('Rotting oranges / multi-source spread in a grid', ['graphs'], 'medium', 'Multi-source BFS'),
            q('Number of ways to decode a digit string', ['dp', 'strings'], 'medium'),
          ],
          { durationMins: 60 },
        ),
      ],
    },
    {
      author: karthik,
      company: 'Amazon',
      role: 'SDE-1',
      year: 2024,
      ctcRange: '42 LPA',
      offerType: 'full-time',
      overallResult: 'rejected',
      upvotes: 2,
      tips: 'I cleared coding but stumbled in the bar raiser: my examples were too vague. Have numbers ready for your stories.',
      rounds: [
        r(
          'online-assessment',
          'medium',
          'cleared',
          [
            q('Merge overlapping delivery time windows', ['arrays', 'greedy'], 'medium'),
            q('Shortest path for a robot with k obstacle removals', ['graphs'], 'hard', 'BFS on (cell, k) state'),
          ],
          { durationMins: 105 },
        ),
        r('coding', 'medium', 'cleared', [q('Serialize and deserialize a binary tree', ['trees', 'recursion'], 'medium')], {
          durationMins: 60,
        }),
        r(
          'managerial',
          'hard',
          'not-cleared',
          [
            q('Describe a time you delivered under a tight deadline', ['behavioural']),
            q('Most challenging bug you fixed', ['projects', 'behavioural']),
          ],
          { durationMins: 50 },
        ),
      ],
    },
    {
      author: sneha,
      company: 'Microsoft',
      role: 'Software Engineer',
      year: 2025,
      ctcRange: '50 LPA',
      offerType: 'full-time',
      overallResult: 'selected',
      upvotes: 5,
      tips: 'Microsoft interviewers let you think. Clarify constraints first and write clean, readable code, they care about code quality more than speed.',
      rounds: [
        r(
          'online-assessment',
          'medium',
          'cleared',
          [
            q('Minimum swaps to make a binary string alternating', ['strings', 'greedy'], 'medium'),
            q('Count subarrays with sum divisible by k', ['arrays', 'hashing', 'math'], 'medium', 'Prefix sums mod k'),
          ],
          { durationMins: 75, description: 'Codility, 2 questions.' },
        ),
        r(
          'coding',
          'medium',
          'cleared',
          [q('Lowest common ancestor in a binary tree', ['trees'], 'easy'), q('Clone a graph', ['graphs', 'hashing'], 'medium')],
          { durationMins: 45 },
        ),
        r(
          'technical',
          'medium',
          'cleared',
          [
            q('Difference between process and thread; explain context switching', ['os'], 'medium'),
            q('Design a parking lot (classes and relationships)', ['lld', 'oops'], 'medium'),
          ],
          { durationMins: 50 },
        ),
        r('hr', 'easy', 'cleared', [q('Why Microsoft? Where do you see yourself in 3 years?', ['hr'])], { durationMins: 30 }),
      ],
    },
    {
      author: meera,
      company: 'Microsoft',
      role: 'Software Engineer Intern',
      year: 2024,
      offerType: 'internship-ppo',
      overallResult: 'rejected',
      upvotes: 1,
      rounds: [
        r(
          'online-assessment',
          'hard',
          'cleared',
          [
            q('Largest rectangle in histogram', ['stack-queue', 'arrays'], 'hard'),
            q('Word break with a given dictionary', ['dp', 'strings'], 'medium'),
          ],
          { durationMins: 90 },
        ),
        r('coding', 'hard', 'not-cleared', [q('Median of a running data stream', ['heap'], 'hard', 'Two heaps; I got the idea late')], {
          durationMins: 45,
        }),
      ],
    },
    {
      author: rahul,
      company: 'Google',
      role: 'STEP Intern',
      year: 2024,
      offerType: 'internship',
      overallResult: 'selected',
      upvotes: 6,
      tips: 'Google asks one problem per round but expects follow-ups. Always state complexity and look for the optimisation.',
      rounds: [
        r(
          'online-assessment',
          'hard',
          'cleared',
          [
            q('Count paths in a DAG with a node-weight constraint', ['graphs', 'dp'], 'hard'),
            q('Minimum adjacent swaps to sort a permutation', ['arrays', 'greedy'], 'medium'),
          ],
          { durationMins: 90 },
        ),
        r('coding', 'hard', 'cleared', [q('Find the number of islands after each land addition', ['graphs'], 'hard', 'Union-find')], {
          durationMins: 45,
        }),
        r(
          'coding',
          'medium',
          'cleared',
          [q('Next permutation of a number, with follow-up for k-th permutation', ['arrays', 'math'], 'medium')],
          { durationMins: 45 },
        ),
      ],
    },
    {
      author: ananya,
      company: 'Goldman Sachs',
      role: 'Analyst',
      year: 2024,
      ctcRange: '28 LPA',
      offerType: 'full-time',
      overallResult: 'selected',
      isAnonymous: true,
      upvotes: 2,
      tips: 'Brush up probability puzzles, every round had one.',
      rounds: [
        r(
          'online-assessment',
          'medium',
          'cleared',
          [
            q('String compression with run-length encoding', ['strings'], 'easy'),
            q('Probability that two dice sum to a prime', ['math', 'aptitude'], 'easy'),
          ],
          { durationMins: 120, description: 'Coding + CS MCQs + aptitude.' },
        ),
        r(
          'technical',
          'medium',
          'cleared',
          [
            q('Find duplicate number in O(1) space', ['arrays', 'two-pointers'], 'medium', "Floyd's cycle detection"),
            q('ACID properties and isolation levels', ['dbms'], 'medium'),
            q('25 horses, 5 tracks: find the fastest 3', ['puzzles'], 'medium'),
          ],
          { durationMins: 60 },
        ),
        r(
          'technical',
          'medium',
          'cleared',
          [
            q('Write a SQL query for the second highest salary per department', ['sql', 'dbms'], 'medium'),
            q('Implement a thread-safe singleton', ['oops', 'language', 'os'], 'medium'),
          ],
          { durationMins: 50 },
        ),
        r('hr', 'easy', 'cleared', [q('Why finance tech?', ['hr'])], { durationMins: 20 }),
      ],
    },
    {
      author: karthik,
      company: 'Goldman Sachs',
      role: 'Analyst',
      year: 2025,
      offerType: 'full-time',
      overallResult: 'rejected',
      rounds: [
        r('online-assessment', 'medium', 'cleared', [q('Minimum platforms needed at a railway station', ['greedy', 'arrays'], 'medium')], {
          durationMins: 120,
        }),
        r(
          'technical',
          'hard',
          'not-cleared',
          [
            q('Trapping rain water', ['arrays', 'two-pointers'], 'hard'),
            q('Expected number of coin tosses to get two heads in a row', ['math', 'puzzles'], 'medium'),
          ],
          { durationMins: 60 },
        ),
      ],
    },
    {
      author: sneha,
      company: 'Flipkart',
      role: 'SDE-1',
      year: 2025,
      ctcRange: '32 LPA',
      offerType: 'full-time',
      overallResult: 'selected',
      upvotes: 3,
      tips: 'Machine coding round is unique: build a working, extensible solution in 90 minutes. Practice small LLD problems end to end.',
      rounds: [
        r(
          'online-assessment',
          'medium',
          'cleared',
          [
            q('Minimum cost to connect all cities', ['graphs', 'greedy'], 'medium', "Kruskal's MST"),
            q('Longest palindromic subsequence', ['dp', 'strings'], 'medium'),
          ],
          { durationMins: 90 },
        ),
        r('technical', 'hard', 'cleared', [q('Machine coding: build a splitwise-style expense sharing service', ['lld', 'oops'], 'hard')], {
          durationMins: 90,
          description: 'Machine coding round.',
        }),
        r(
          'coding',
          'medium',
          'cleared',
          [q('Kth smallest element in a BST', ['trees', 'binary-search'], 'medium'), q('Coin change: minimum coins', ['dp'], 'medium')],
          { durationMins: 60 },
        ),
        r('hr', 'easy', 'cleared', [q('Culture fit and relocation preferences', ['hr'])]),
      ],
    },
    {
      author: meera,
      company: 'Atlassian',
      role: 'Graduate Software Engineer',
      year: 2024,
      ctcRange: '54 LPA',
      offerType: 'full-time',
      overallResult: 'selected',
      upvotes: 4,
      rounds: [
        r(
          'online-assessment',
          'medium',
          'cleared',
          [q('Implement a rate limiter for API keys', ['hashing', 'stack-queue', 'lld'], 'medium')],
          { durationMins: 90 },
        ),
        r('coding', 'medium', 'cleared', [q('Design a snake game (data structures + operations)', ['lld', 'stack-queue'], 'medium')], {
          durationMins: 60,
        }),
        r('system-design', 'medium', 'cleared', [q('Design a tagging system for Jira issues', ['system-design', 'dbms'], 'medium')], {
          durationMins: 60,
        }),
        r('managerial', 'easy', 'cleared', [q('Atlassian values: "Don\'t #@!% the customer"', ['behavioural'])]),
      ],
    },
    {
      author: rahul,
      company: 'Oracle',
      role: 'Server Technology MTS',
      year: 2025,
      ctcRange: '19 LPA',
      offerType: 'full-time',
      overallResult: 'selected',
      rounds: [
        r('online-assessment', 'easy', 'cleared', [
          q('Reverse words in a sentence', ['strings'], 'easy'),
          q('MCQs on OS scheduling and SQL joins', ['os', 'sql'], 'easy'),
        ]),
        r(
          'technical',
          'medium',
          'cleared',
          [
            q('Explain indexing and B+ trees', ['dbms'], 'medium'),
            q('Deadlock conditions and prevention', ['os'], 'medium'),
            q('Detect a loop in a linked list', ['linked-list', 'two-pointers'], 'easy'),
          ],
          { durationMins: 60 },
        ),
        r('hr', 'easy', 'cleared', [q('Strengths, weaknesses, and willingness to relocate', ['hr'])]),
      ],
    },
    {
      author: karthik,
      company: 'Zoho',
      role: 'Member Technical Staff',
      year: 2024,
      ctcRange: '8.4 LPA',
      offerType: 'full-time',
      overallResult: 'selected',
      upvotes: 2,
      tips: 'Zoho has a long advanced-programming round, practise writing full programs in C/Java without an IDE.',
      rounds: [
        r(
          'online-assessment',
          'easy',
          'cleared',
          [
            q('Output prediction on C pointers and loops', ['language'], 'easy'),
            q('Aptitude: time and work, percentages', ['aptitude'], 'easy'),
          ],
          { durationMins: 90 },
        ),
        r(
          'coding',
          'medium',
          'cleared',
          [q('Print a matrix in spiral order', ['arrays'], 'easy'), q('Find all subsets that sum to a target', ['recursion'], 'medium')],
          { durationMins: 180, description: 'Advanced programming round, 5 problems.' },
        ),
        r('technical', 'medium', 'cleared', [q('Build a console railway reservation system', ['lld', 'oops'], 'medium')], {
          durationMins: 180,
        }),
        r('hr', 'easy', 'cleared', [q('Family background and long-term plans', ['hr'])]),
      ],
    },
    {
      author: meera,
      company: 'Deloitte',
      role: 'Analyst',
      year: 2025,
      ctcRange: '7.6 LPA',
      offerType: 'full-time',
      overallResult: 'selected',
      rounds: [
        r('online-assessment', 'easy', 'cleared', [
          q('Logical reasoning and verbal ability section', ['reasoning', 'aptitude'], 'easy'),
          q('Find the second largest element in an array', ['arrays'], 'easy'),
        ]),
        r('group-discussion', 'easy', 'cleared', [q('GD topic: Is AI a threat to jobs?', ['behavioural'])], { durationMins: 20 }),
        r('technical', 'easy', 'cleared', [
          q('Explain your project architecture', ['projects', 'web'], 'easy'),
          q('Normalisation forms with examples', ['dbms'], 'easy'),
        ]),
        r('hr', 'easy', 'cleared', [q('Situational questions about client handling', ['behavioural', 'hr'])]),
      ],
    },
    {
      author: ananya,
      company: 'TCS',
      role: 'Digital',
      year: 2025,
      ctcRange: '7 LPA',
      offerType: 'full-time',
      overallResult: 'selected',
      rounds: [
        r(
          'online-assessment',
          'easy',
          'cleared',
          [
            q('Numerical ability and reasoning sections', ['aptitude', 'reasoning'], 'easy'),
            q('Find the count of vowels in each word', ['strings'], 'easy'),
          ],
          { durationMins: 190 },
        ),
        r('technical', 'easy', 'cleared', [
          q('OOP pillars with real-world examples', ['oops'], 'easy'),
          q('Difference between TCP and UDP', ['cn'], 'easy'),
        ]),
        r('hr', 'easy', 'cleared', [q('Willingness to sign the service agreement', ['hr'])]),
      ],
    },
    {
      author: sneha,
      company: 'TCS',
      role: 'Ninja',
      year: 2024,
      ctcRange: '3.6 LPA',
      offerType: 'full-time',
      overallResult: 'selected',
      isAnonymous: true,
      rounds: [
        r('online-assessment', 'easy', 'cleared', [q('Aptitude, verbal and one easy coding question', ['aptitude', 'arrays'], 'easy')]),
        r('technical', 'easy', 'cleared', [
          q('What is a primary key vs unique key?', ['dbms'], 'easy'),
          q('OSI model layers', ['cn'], 'easy'),
        ]),
        r('hr', 'easy', 'cleared', [q('Introduce yourself', ['hr'])]),
      ],
    },
    {
      author: karthik,
      company: 'Infosys',
      role: 'Specialist Programmer',
      year: 2025,
      ctcRange: '9.5 LPA',
      offerType: 'full-time',
      overallResult: 'selected',
      rounds: [
        r(
          'online-assessment',
          'hard',
          'cleared',
          [
            q('Maximum XOR of two numbers in an array', ['bit-manipulation'], 'hard'),
            q('Count distinct palindromic substrings', ['strings', 'dp'], 'hard'),
          ],
          { durationMins: 180 },
        ),
        r('technical', 'medium', 'cleared', [
          q('Explain HashMap internals in Java', ['language', 'hashing'], 'medium'),
          q('Virtual memory and paging', ['os'], 'medium'),
        ]),
      ],
    },
    // Moderation queue examples
    {
      author: meera,
      company: 'Accenture',
      role: 'Associate Software Engineer',
      year: 2025,
      ctcRange: '4.5 LPA',
      offerType: 'full-time',
      overallResult: 'selected',
      status: 'pending',
      rounds: [
        r('online-assessment', 'easy', 'cleared', [q('Cognitive and technical assessment', ['aptitude', 'reasoning'], 'easy')]),
        r('technical', 'easy', 'cleared', [q('Basics of cloud computing and SDLC', ['web'], 'easy')]),
      ],
    },
    {
      author: rahul,
      company: 'Amazon',
      role: 'SDE-1',
      year: 2025,
      offerType: 'full-time',
      overallResult: 'awaiting',
      status: 'pending',
      rounds: [
        r('online-assessment', 'medium', 'cleared', [q('Partition array into k subsets with equal sum', ['dp', 'recursion'], 'hard')]),
        r('coding', 'medium', 'awaiting', [q('Vertical order traversal of a binary tree', ['trees', 'hashing'], 'medium')]),
      ],
    },
    {
      author: karthik,
      company: 'Flipkart',
      role: 'SDE-1',
      year: 2025,
      offerType: 'full-time',
      overallResult: 'rejected',
      status: 'rejected',
      rejectionReason: 'Please describe the questions instead of pasting the exact problem statement from the test (NDA).',
      rounds: [r('online-assessment', 'medium', 'not-cleared', [q('Pasted full problem text here...', ['arrays'], 'medium')])],
    },
  ];

  const voters = [junior, ...seniors, admin];
  await Experience.insertMany(
    seeds.map((s, i) => {
      const c = co(s.company);
      const status = s.status ?? 'approved';
      const upvotes = voters
        .filter((v) => String(v._id) !== String(s.author._id))
        .slice(0, s.upvotes ?? 0)
        .map((v) => v._id);
      return {
        author: s.author._id,
        company: c._id,
        companyName: c.name,
        companySlug: c.slug,
        role: s.role,
        year: s.year,
        ctcRange: s.ctcRange,
        offerType: s.offerType,
        overallResult: s.overallResult,
        isAnonymous: s.isAnonymous ?? false,
        tips: s.tips,
        rounds: s.rounds.map((rd, j) => ({ ...rd, order: j + 1 })),
        status,
        rejectionReason: s.rejectionReason,
        reviewedBy: status === 'pending' ? undefined : admin._id,
        reviewedAt: status === 'pending' ? undefined : new Date(),
        upvotes,
        upvoteCount: upvotes.length,
        // Spread creation dates so "recent" sorting looks natural.
        createdAt: new Date(Date.now() - (seeds.length - i) * 36e5 * 20),
      };
    }),
  );

  return {
    companies: companies.length,
    experiences: seeds.length,
    accounts: {
      admin: { email: adminEmail, password: adminPassword },
      senior: { email: ananya.email, password: 'Senior@12345' },
      junior: { email: junior.email, password: 'Junior@12345' },
    },
  };
}
