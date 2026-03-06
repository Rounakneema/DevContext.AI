const fs = require('fs');

const path = 'd:\\AI fo bharat\\frontend\\src\\pages\\InterviewPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
    // Surfaces
    [/rgba\(255,255,255,0\.0[34567]\)/g, 'var(--surface)'],
    [/rgba\(13,13,18,0\.9\)/g, 'var(--surface)'],

    // Borders
    [/1px solid rgba\(255,255,255,0\.0[68]\)/g, '1px solid var(--border)'],
    [/1px solid rgba\(255,255,255,0\.1[02]?\)/g, '1px solid var(--border)'],

    // Texts
    [/rgba\(232,232,240,0\.[4567]\)/g, 'var(--text2)'],
    [/rgba\(232,232,240,0\.[23]\d?\)/g, 'var(--text3)'],
    [/"#e8e8f0"/g, '"var(--text)"'],
    [/"#0d0d12"/g, '"var(--bg)"'],

    // Headings etc - convert #fff to var(--text) unless it's in a button background
    // We can do a safer replace:
    [/(color:\s*)"#fff"/g, '$1"var(--text)"'],
    // Revert the buttons that use #fff explicitly
    [/(color:\s*)"var\(--text\)"(.*?)cursor:\s*"(?:pointer|not-allowed)"/g, '$1"#fff"$2cursor: "$3"'], // heuristic

    // Accents
    [/#a78bfa/ig, 'var(--accent)'],
    [/#7C5CDB/ig, 'var(--accent)'],
    [/linear-gradient\(135deg, var\(--accent\), #5a3db5\)/g, 'var(--accent)'], // replace gradients with solid accent
    [/rgba\(124,92,219,0\.\d+\)/g, 'var(--accent-light)'],
    [/border:\s*"1px solid rgba\(124,92,219,0\.\d+\)"/g, 'border: "1px solid var(--accent)"'],

    // Error / Success colors
    [/#fc8181/ig, 'var(--danger)'],
    [/rgba\(231,76,60,0\.\d+\)/g, 'var(--danger-light)'],
    [/border:\s*"1px solid rgba\(231,76,60,0\.\d+\)"/g, 'border: "1px solid var(--danger)"'],
];

replacements.forEach(([regex, replacement]) => {
    content = content.replace(regex, replacement);
});

// Fix any broken buttons
content = content.replace(/color:\s*"var\(--text\)"([^}]*?linear-gradient)/g, 'color: "#fff"$1');
content = content.replace(/background:\s*"var\(--accent\)"([^}]*?)color:\s*"var\(--text\)"/g, 'background: "var(--accent)"$1color: "#fff"');
content = content.replace(/color:\s*"var\(--text\)"([^}]*?background:\s*"var\(--accent\)")/g, 'color: "#fff"$1');

// One more pass for buttons having "cursor: pointer" and "linear-gradient"
content = content.replace(/color:\s*"var\(--text\)"([^>]*?background:\s*[^>]*?var\(--accent\))/g, 'color: "#fff"$1');

fs.writeFileSync(path, content, 'utf8');
console.log("Replacements done for InterviewPage.tsx.");
