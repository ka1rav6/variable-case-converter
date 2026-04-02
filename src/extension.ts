import * as vscode from 'vscode';

// ─── Case Conversion Utilities ────────────────────────────────────────────────

function tokenize(name: string): string[] {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[-_\s]+/g, ' ')
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(Boolean);
}

function toCamelCase(name: string): string {
  const tokens = tokenize(name);
  return tokens.map((t, i) => (i === 0 ? t : t[0].toUpperCase() + t.slice(1))).join('');
}

function toPascalCase(name: string): string {
  return tokenize(name).map(t => t[0].toUpperCase() + t.slice(1)).join('');
}

function toSnakeCase(name: string): string {
  return tokenize(name).join('_');
}

function toKebabCase(name: string): string {
  return tokenize(name).join('-');
}

export function convertName(name: string, targetCase: string): string {
  switch (targetCase) {
    case 'camelCase':  return toCamelCase(name);
    case 'PascalCase': return toPascalCase(name);
    case 'snake_case': return toSnakeCase(name);
    case 'kebab-case': return toKebabCase(name);
    default:           return name;
  }
}

// ─── Built-in Skip List ───────────────────────────────────────────────────────

const COMMON_BUILTINS = new Set([
  // JS/TS globals & methods
  'console','log','warn','error','info','debug','assert','table','time','timeEnd',
  'Math','JSON','Object','Array','String','Number','Boolean','Symbol','BigInt',
  'Promise','async','await','setTimeout','setInterval','clearTimeout','clearInterval',
  'parseInt','parseFloat','isNaN','isFinite','encodeURI','decodeURI',
  'encodeURIComponent','decodeURIComponent','fetch','XMLHttpRequest',
  'document','window','navigator','location','history','localStorage','sessionStorage',
  'process','Buffer','require','module','exports','__dirname','__filename',
  'Error','TypeError','RangeError','SyntaxError','ReferenceError',
  'Map','Set','WeakMap','WeakSet','Date','RegExp','Proxy','Reflect',
  'undefined','null','true','false','NaN','Infinity',
  'toString','valueOf','hasOwnProperty','constructor','prototype','length',
  'push','pop','shift','unshift','splice','slice','concat','join','reverse',
  'sort','indexOf','lastIndexOf','includes','find','findIndex','filter','map',
  'reduce','reduceRight','forEach','every','some','flat','flatMap','keys','values',
  'entries','assign','freeze','create','defineProperty','getOwnPropertyNames',
  'parse','stringify','then','catch','finally','resolve','reject','all','race',
  'super','this','arguments','new','delete','typeof','instanceof',
  'void','in','of','yield','return','throw','try','catch','finally',
  'if','else','for','while','do','switch','case','break','continue','default',
  'class','extends','import','export','from','as','let','const','var','function',
  'type','interface','enum','namespace','declare','abstract','implements',
  'public','private','protected','static','readonly','override',
  'addEventListener','removeEventListener','dispatchEvent','preventDefault',
  'stopPropagation','querySelector','querySelectorAll','getElementById',
  'getElementsByClassName','getElementsByTagName','createElement','appendChild',
  'removeChild','innerHTML','textContent','classList','style','setAttribute',
  'getAttribute','removeAttribute',
  // Python builtins
  'print','input','len','range','type','isinstance','issubclass','hasattr','getattr',
  'setattr','delattr','dir','vars','help','id','hash','abs','round','min','max',
  'sum','sorted','reversed','enumerate','zip','map','filter','any','all','open',
  'int','float','str','bool','list','dict','set','tuple','bytes','bytearray',
  'memoryview','complex','object','super','property','classmethod','staticmethod',
  'repr','eval','exec','compile','globals','locals','__name__','__file__','__doc__',
  'None','True','False','and','or','not','is','in','lambda','yield','pass','del',
  'raise','with','as','assert','from','import','global','nonlocal',
  'Exception','ValueError','TypeError','KeyError','IndexError','AttributeError',
  'RuntimeError','StopIteration','GeneratorExit','SystemExit','KeyboardInterrupt',
  // React & common framework
  'React','useState','useEffect','useRef','useCallback','useMemo','useContext',
  'useReducer','createContext','forwardRef','memo','Fragment','createElement',
  'render','Component','PureComponent','StrictMode','Suspense','lazy',
  'props','state','children','key','ref','defaultProps','propTypes',
]);

function isBuiltin(name: string): boolean {
  return COMMON_BUILTINS.has(name);
}

// ─── Identifier Extraction ────────────────────────────────────────────────────

export function extractUserIdentifiers(source: string, _languageId: string): Set<string> {
  const identifiers = new Set<string>();

  const patterns: RegExp[] = [
    // JS/TS variable declarations
    /(?:let|const|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    // Python assignment: line-start identifier, single = only (not ==, +=, -=, !=, <=, >=)
    /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=[^=]/gm,
    // Function / def declarations
    /(?:function\s+|def\s+)([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    // Arrow / function expressions assigned to a variable
    /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?(?:\(|function)/g,
    // Class declarations
    /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    // Named function parameters
    /function\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(([^)]*)\)/g,
    // Arrow function parameters
    /\(([^)]*)\)\s*=>/g,
    // Object destructuring: const { a, b } = ...
    /(?:const|let|var)\s*\{([^}]+)\}\s*=/g,
    // Array destructuring: const [a, b] = ...
    /(?:const|let|var)\s*\[([^\]]+)\]\s*=/g,
    // TypeScript: interface / type / enum names
    /(?:interface|type|enum)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    // JS for-of / for-in with declaration
    /for\s*\(\s*(?:let|const|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+(?:in|of)\b/g,
    // Python for-in
    /\bfor\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\b/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    const re = new RegExp(pattern.source, pattern.flags);
    while ((match = re.exec(source)) !== null) {
      for (let g = 1; g < match.length; g++) {
        if (!match[g]) continue;
        const parts = match[g].split(',').map(p =>
          p.trim()
           .replace(/[=:?!*&[\]{}()]/g, ' ')
           .trim()
           .split(/\s+/)[0]
           .replace(/^\.+/, '')         // strip rest/spread leading dots
           .replace(/[^a-zA-Z0-9_$]/g, '') // strip any trailing junk (e.g. char after = in lookahead)
        );
        for (const name of parts) {
          if (name && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name) && !isBuiltin(name) && name.length > 1) {
            identifiers.add(name);
          }
        }
      }
    }
  }
  return identifiers;
}

// ─── Core Conversion Engine ───────────────────────────────────────────────────

interface RenameResult {
  text: string;       // converted source (may equal input if nothing changed)
  renamedCount: number; // how many distinct identifiers were actually renamed
}

function applyRenames(source: string, identifiers: Set<string>, targetCase: string): RenameResult {
  const renameMap = new Map<string, string>();
  for (const name of identifiers) {
    const converted = convertName(name, targetCase);
    // Only add to map if the name genuinely changes in this case
    if (converted !== name) renameMap.set(name, converted);
  }

  if (renameMap.size === 0) return { text: source, renamedCount: 0 };

  // Sort longest-first to prevent partial replacement (e.g. "myVar" before "my")
  const sortedKeys = [...renameMap.keys()].sort((a, b) => b.length - a.length);
  let result = source;
  let renamedCount = 0;
  for (const original of sortedKeys) {
    const re = new RegExp(`\\b${escapeRegex(original)}\\b`, 'g');
    const before = result;
    result = result.replace(re, renameMap.get(original)!);
    if (result !== before) renamedCount++;
  }

  return { text: result, renamedCount };
}

export function convertSource(source: string, targetCase: string, languageId: string): RenameResult {
  const identifiers = extractUserIdentifiers(source, languageId);
  return applyRenames(source, identifiers, targetCase);
}

export function convertSelection(
  selectedText: string,
  targetCase: string,
  languageId: string
): RenameResult {
  const identifiers = extractUserIdentifiers(selectedText, languageId);
  return applyRenames(selectedText, identifiers, targetCase);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Shared UI Helpers ────────────────────────────────────────────────────────

const CASE_ITEMS = [
  { label: '$(symbol-variable)  camelCase',  description: 'e.g. myVariableName',   detail: 'JS / TS variables & functions',   pick: 'camelCase'  },
  { label: '$(symbol-class)     PascalCase', description: 'e.g. MyVariableName',   detail: 'Classes & React components',      pick: 'PascalCase' },
  { label: '$(symbol-field)     snake_case', description: 'e.g. my_variable_name', detail: 'Python & database identifiers',   pick: 'snake_case' },
  { label: '$(symbol-key)       kebab-case', description: 'e.g. my-variable-name', detail: 'CSS classes & HTML attributes',   pick: 'kebab-case' },
];

const SUPPORTED_LANGUAGES = [
  'javascript','typescript','javascriptreact','typescriptreact',
  'python','java','c','cpp','csharp','go','rust','php','ruby','swift',
];

async function confirmUnsupportedLanguage(langId: string): Promise<boolean> {
  if (SUPPORTED_LANGUAGES.includes(langId)) return true;
  const answer = await vscode.window.showWarningMessage(
    `Language "${langId}" may not be fully supported. Proceed anyway?`,
    'Yes', 'No'
  );
  return answer === 'Yes';
}

async function pickTargetCase(title: string): Promise<string | undefined> {
  const choice = await vscode.window.showQuickPick(CASE_ITEMS, {
    placeHolder: 'Select the target naming convention',
    title,
  });
  return (choice as any)?.pick;
}

// ─── Apply Helpers ────────────────────────────────────────────────────────────

async function applyWholeFile(editor: vscode.TextEditor, targetCase: string): Promise<void> {
  const doc = editor.document;
  const original = doc.getText();

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `Converting file → ${targetCase}…`, cancellable: false },
    async () => {
      const { text: converted, renamedCount } = convertSource(original, targetCase, doc.languageId);
      if (renamedCount === 0) {
        vscode.window.showInformationMessage(`No identifiers needed renaming — all user-defined names already match ${targetCase}.`);
        return;
      }
      const edit = new vscode.WorkspaceEdit();
      const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(original.length));
      edit.replace(doc.uri, fullRange, converted);
      await vscode.workspace.applyEdit(edit);
      vscode.window.showInformationMessage(`✅ Whole file: renamed ${renamedCount} identifier(s) → ${targetCase}`);
    }
  );
}

async function applySelectionOnly(
  editor: vscode.TextEditor,
  selection: vscode.Selection,
  targetCase: string
): Promise<void> {
  const doc = editor.document;
  const selectedText = doc.getText(selection);

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `Converting selection → ${targetCase}…`, cancellable: false },
    async () => {
      const { text: converted, renamedCount } = convertSelection(selectedText, targetCase, doc.languageId);
      if (renamedCount === 0) {
        vscode.window.showInformationMessage(`No identifiers needed renaming in selection — all already match ${targetCase}.`);
        return;
      }
      const edit = new vscode.WorkspaceEdit();
      edit.replace(doc.uri, selection, converted);
      await vscode.workspace.applyEdit(edit);
      vscode.window.showInformationMessage(`✅ Selection: renamed ${renamedCount} identifier(s) → ${targetCase}`);
    }
  );
}

// ─── Command Implementations ──────────────────────────────────────────────────

/**
 * Primary "smart" command: if text is selected → ask scope, else convert file.
 * Bound to the main keyboard shortcut Ctrl+Shift+Alt+C.
 */
async function cmdSmart() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { vscode.window.showErrorMessage('No active editor.'); return; }
  if (!await confirmUnsupportedLanguage(editor.document.languageId)) return;

  const hasSelection = !editor.selection.isEmpty;

  const scopeItems = hasSelection
    ? [
        { label: '$(selection) Convert Selection',  description: 'Only the highlighted text',  scope: 'selection' },
        { label: '$(file-code) Convert Whole File', description: 'Every identifier in the file', scope: 'file' },
      ]
    : undefined;

  let scope: 'file' | 'selection' = 'file';
  if (scopeItems) {
    const scopeChoice = await vscode.window.showQuickPick(scopeItems, {
      title: 'Variable Case Converter — Scope',
      placeHolder: 'What do you want to convert?',
    });
    if (!scopeChoice) return;
    scope = (scopeChoice as any).scope;
  }

  const targetCase = await pickTargetCase(
    scope === 'selection' ? 'Convert Selection — Choose Case' : 'Convert Whole File — Choose Case'
  );
  if (!targetCase) return;

  if (scope === 'selection') {
    await applySelectionOnly(editor, editor.selection, targetCase);
  } else {
    await applyWholeFile(editor, targetCase);
  }
}

/** Whole-file with picker */
async function cmdConvertFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { vscode.window.showErrorMessage('No active editor.'); return; }
  if (!await confirmUnsupportedLanguage(editor.document.languageId)) return;
  const targetCase = await pickTargetCase('Convert Whole File — Choose Case');
  if (!targetCase) return;
  await applyWholeFile(editor, targetCase);
}

/** Selection with picker — falls back to whole-file offer if nothing selected */
async function cmdConvertSelection() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { vscode.window.showErrorMessage('No active editor.'); return; }

  if (editor.selection.isEmpty) {
    const fb = await vscode.window.showWarningMessage(
      'No text selected. Convert the whole file instead?',
      'Convert Whole File', 'Cancel'
    );
    if (fb === 'Convert Whole File') await cmdConvertFile();
    return;
  }

  if (!await confirmUnsupportedLanguage(editor.document.languageId)) return;
  const targetCase = await pickTargetCase('Convert Selection — Choose Case');
  if (!targetCase) return;
  await applySelectionOnly(editor, editor.selection, targetCase);
}

/** Direct file commands (no picker) */
async function cmdFileDirect(targetCase: string) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { vscode.window.showErrorMessage('No active editor.'); return; }
  if (!await confirmUnsupportedLanguage(editor.document.languageId)) return;
  await applyWholeFile(editor, targetCase);
}

/** Direct selection commands (no picker) */
async function cmdSelectionDirect(targetCase: string) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { vscode.window.showErrorMessage('No active editor.'); return; }
  if (editor.selection.isEmpty) {
    vscode.window.showWarningMessage('No text selected. Select code first, or use a File command.');
    return;
  }
  if (!await confirmUnsupportedLanguage(editor.document.languageId)) return;
  await applySelectionOnly(editor, editor.selection, targetCase);
}

// ─── Activate ─────────────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {
  const reg = (id: string, fn: (...args: any[]) => any) =>
    context.subscriptions.push(vscode.commands.registerCommand(id, fn));

  // Smart primary command (detects selection automatically)
  reg('variableCaseConverter.smart',              cmdSmart);

  // Explicit scope + picker
  reg('variableCaseConverter.convertFile',        cmdConvertFile);
  reg('variableCaseConverter.convertSelection',   cmdConvertSelection);

  // Direct whole-file — no picker, instant
  reg('variableCaseConverter.file.camelCase',     () => cmdFileDirect('camelCase'));
  reg('variableCaseConverter.file.PascalCase',    () => cmdFileDirect('PascalCase'));
  reg('variableCaseConverter.file.snake_case',    () => cmdFileDirect('snake_case'));
  reg('variableCaseConverter.file.kebabCase',     () => cmdFileDirect('kebab-case'));

  // Direct selection — no picker, instant
  reg('variableCaseConverter.selection.camelCase',  () => cmdSelectionDirect('camelCase'));
  reg('variableCaseConverter.selection.PascalCase', () => cmdSelectionDirect('PascalCase'));
  reg('variableCaseConverter.selection.snake_case', () => cmdSelectionDirect('snake_case'));
  reg('variableCaseConverter.selection.kebabCase',  () => cmdSelectionDirect('kebab-case'));

  // Status bar
  const bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  bar.command = 'variableCaseConverter.smart';
  bar.text    = '$(symbol-variable) Case';
  bar.tooltip = 'Variable Case Converter\n─────────────────────────\nClick (or Ctrl+Shift+Alt+C) → smart convert\nSelect text first to convert only that region';
  bar.show();
  context.subscriptions.push(bar);
}

export function deactivate() {}