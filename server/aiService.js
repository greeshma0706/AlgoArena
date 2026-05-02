const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generate a coding problem using Claude
 */
async function generateProblem(difficulty = 'medium', topic = 'arrays') {
  const prompt = `Generate a competitive programming problem for a 1v1 coding battle with the following specs:

- Difficulty: ${difficulty}
- Topic: ${topic}
- Language: Python

Return ONLY valid JSON (no markdown, no backticks, no explanation) with this exact structure:
{
  "title": "Problem Title",
  "difficulty": "${difficulty}",
  "topic": "${topic}",
  "language": "python",
  "description": "Full problem description with context. Make it engaging and clear. Use markdown formatting.",
  "examples": [
    {
      "input": "example input as string",
      "output": "example output as string",
      "explanation": "brief explanation"
    }
  ],
  "testCases": [
    {"input": "test input string", "expected": "expected output string", "hidden": false},
    {"input": "test input string", "expected": "expected output string", "hidden": false},
    {"input": "test input string", "expected": "expected output string", "hidden": true},
    {"input": "test input string", "expected": "expected output string", "hidden": true}
  ],
  "starterCode": "def solution(args):\\n    # Your code here\\n    pass",
  "constraints": ["constraint 1", "constraint 2"],
  "hint": "A brief hint about the approach without giving away the solution"
}

IMPORTANT RULES:
1. The function must always be named "solution"
2. Input will be passed as a string via stdin. The solution function should parse it.
3. The starter code should include the solution function and a main block that reads input and prints the result
4. Make the starterCode template like this:
   def solution(input_str):
       # Your code here
       pass

   if __name__ == "__main__":
       import sys
       input_str = sys.stdin.read().strip()
       print(solution(input_str))
5. Include exactly 4 test cases: 2 visible (hidden: false) and 2 hidden (hidden: true)
6. For ${difficulty} difficulty, calibrate complexity appropriately:
   - easy: simple loops, basic operations
   - medium: moderate logic, common patterns
   - hard: advanced algorithms, optimization needed
7. Ensure test cases have unambiguous expected outputs
8. Input and expected output in testCases should be plain strings
9. Make the problem fun and engaging - think competitive programming style`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0].text.trim();
    // Try to parse JSON, handling potential markdown wrapping
    let jsonStr = content;
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const problem = JSON.parse(jsonStr);
    console.log(`[AI] Generated problem: "${problem.title}" (${difficulty}, ${topic})`);
    return problem;
  } catch (error) {
    console.error('[AI] Error generating problem:', error.message);
    // Return a fallback problem
    return getFallbackProblem(difficulty, topic);
  }
}

/**
 * Get an AI hint for a player
 */
async function getHint(problem, playerCode) {
  const prompt = `A player is working on this coding problem in a competitive 1v1 battle:

Problem: ${problem.title}
Description: ${problem.description}

Their current code:
\`\`\`python
${playerCode || '# No code written yet'}
\`\`\`

Give a helpful hint in 2-3 sentences. Guide them toward the right approach WITHOUT giving away the solution or writing code. Be encouraging but concise. Focus on the algorithm or data structure they should consider.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const hint = message.content[0].text.trim();
    console.log(`[AI] Generated hint for "${problem.title}"`);
    return hint;
  } catch (error) {
    console.error('[AI] Error generating hint:', error.message);
    return problem.hint || 'Think about the problem constraints and what data structure would be most efficient here.';
  }
}

/**
 * Fallback problem in case AI generation fails
 */
function getFallbackProblem(difficulty, topic) {
  return {
    title: 'Two Sum',
    difficulty: difficulty,
    topic: topic,
    language: 'python',
    description:
      'Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.\n\nYou may assume that each input has exactly one solution, and you may not use the same element twice.\n\nReturn the answer as two space-separated indices (0-indexed).',
    examples: [
      {
        input: '2 7 11 15\\n9',
        output: '0 1',
        explanation: 'nums[0] + nums[1] = 2 + 7 = 9',
      },
      {
        input: '3 2 4\\n6',
        output: '1 2',
        explanation: 'nums[1] + nums[2] = 2 + 4 = 6',
      },
    ],
    testCases: [
      { input: '2 7 11 15\n9', expected: '0 1', hidden: false },
      { input: '3 2 4\n6', expected: '1 2', hidden: false },
      { input: '3 3\n6', expected: '0 1', hidden: true },
      { input: '1 5 3 7 2\n9', expected: '1 3', hidden: true },
    ],
    starterCode: `def solution(input_str):
    lines = input_str.strip().split("\\n")
    nums = list(map(int, lines[0].split()))
    target = int(lines[1])
    # Your code here
    pass

if __name__ == "__main__":
    import sys
    input_str = sys.stdin.read().strip()
    print(solution(input_str))`,
    constraints: [
      '2 <= len(nums) <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Exactly one valid answer exists',
    ],
    hint: 'Consider using a hash map to store numbers you have seen so far and their indices.',
  };
}

module.exports = { generateProblem, getHint };
