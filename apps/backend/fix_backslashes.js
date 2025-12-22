
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/services/resume-builder/templateService.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix the mangled lines I saw in read_file
// Replace literal backspace with 'b' (assuming it was part of \begin)
// Note: \x08 is backspace. If it was `\b` in a string, it became \x08.
// If the code was blocks.push(` \x08egin`), we want blocks.push(` \\begin`)
content = content.replace(/\\\x08/g, '\\b');
content = content.replace(/\x08/g, 'b'); 

// Replace literal form feed with 'f' (assuming it was part of \footnotesize)
content = content.replace(/\\\x0C/g, '\\f');
content = content.replace(/\x0C/g, 'f');

// Target specific LaTeX commands that start with letters that are JS escape sequences
const commands = [
    'begin', 'end', 'educationItem', 'summary', 'introduction', 
    'skillsSection', 'skillItem', 'experienceSection', 'experienceItem', 
    'projectItem', 'item', 'itemsep', 'vspace', 'vfill', 'footnotesize', 
    'color', 'href', 'textbackslash', 'ldots', 'textwidth'
];

commands.forEach(cmd => {
    // Replace \cmd with \\cmd if it's not already \\cmd
    // We match \cmd where the \ is not preceded by another \
    // In JS string literals, we need to match the literal \
    
    // This is tricky because we are reading the file as UTF-8. 
    // If the file has `\begin`, it means the literal characters \ and b.
    // If it has `\\begin`, it means \ \ b.
    
    // However, if the JS source was `out.push("\begin")`, the file ON DISK 
    // might actually contain the backspace character if it was "compiled" or "transpiled", 
    // but here we are looking at the source code.
    
    // If the source code has `\begin`, we want to change it to `\\begin`.
    
    const re = new RegExp('\\(?<!\\)' + cmd, 'g');
    // content = content.replace(re, '\\\' + cmd); 
    // Wait, regex lookbehind in JS might not work in all environments, 
    // but Node.js 12+ supports it.
});

// simpler approach:
content = content.replace(/([^\\])\\(begin|end|educationItem|summary|introduction|skillsSection|skillItem|experienceSection|experienceItem|projectItem|item|itemsep|vspace|vfill|footnotesize|color|href|textbackslash|ldots|textwidth)/g, '$1\\\\$2');

// Fix the escape map specifically
content = content.replace(/[\][/\\/g, "\\\\textbackslash{}" ]/g, '[/\\/g, "\\\\textbackslash{}" ]');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed templateService.ts');

