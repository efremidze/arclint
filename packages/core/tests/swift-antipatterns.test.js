const fs = require('fs');
const os = require('os');
const path = require('path');

const { SwiftImportGraphAnalyzer } = require('../dist/languages/swift/analyzer');
const { RuleEngine } = require('../dist/rules');
const { ArchitecturePattern, Language, LayerType, ViolationType } = require('../dist/types');

describe('Swift anti-pattern detection', () => {
  function mvvmConfig() {
    return {
      version: '0.1.0',
      pattern: ArchitecturePattern.MVVM,
      language: Language.SWIFT,
      rootDir: './Sources',
      layers: [
        { name: LayerType.VIEW, pattern: '**/Views/**', canDependOn: [LayerType.VIEWMODEL] },
        { name: LayerType.VIEWMODEL, pattern: '**/ViewModels/**', canDependOn: [LayerType.MODEL] },
        { name: LayerType.MODEL, pattern: '**/Models/**', canDependOn: [] }
      ],
      rules: {
        enforceLayerBoundaries: true,
        preventCircularDependencies: false,
        businessLogicInDomain: true
      },
      ignore: ['**/Tests/**']
    };
  }

  test('flags networking and decoding inside SwiftUI View', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arclint-swift-antipattern-1-'));
    const sourcesDir = path.join(tempDir, 'Sources');
    const viewsDir = path.join(sourcesDir, 'Shop', 'Views');

    fs.mkdirSync(viewsDir, { recursive: true });

    fs.writeFileSync(
      path.join(viewsDir, 'UserProfileView.swift'),
      [
        'import SwiftUI',
        '',
        'struct UserProfileView: View {',
        '  @State private var username: String = ""',
        '',
        '  var body: some View {',
        '    Button("Load") {',
        '      loadUser()',
        '    }',
        '  }',
        '',
        '  func loadUser() {',
        '    URLSession.shared.dataTask(with: URL(string: "https://api.example.com/user")!) { data, _, _ in',
        '      if let data = data {',
        '        _ = try? JSONDecoder().decode(User.self, from: data)',
        '      }',
        '    }.resume()',
        '  }',
        '}',
        '',
        'struct User: Decodable {',
        '  let name: String',
        '}'
      ].join('\n'),
      'utf8'
    );

    const analyzer = new SwiftImportGraphAnalyzer();
    const modules = await analyzer.analyzeDirectory(sourcesDir, sourcesDir);
    const result = new RuleEngine(mvvmConfig()).analyze(modules);

    const logicViolations = result.violations.filter(
      (v) => v.type === ViolationType.MISPLACED_BUSINESS_LOGIC && v.filePath.endsWith('UserProfileView.swift')
    );

    expect(logicViolations.some((v) => v.message.includes('Networking logic'))).toBe(true);
    expect(logicViolations.some((v) => v.message.includes('JSON decoding'))).toBe(true);
  });

  test('flags reduce-based business calculation inside SwiftUI View', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arclint-swift-antipattern-2-'));
    const sourcesDir = path.join(tempDir, 'Sources');
    const viewsDir = path.join(sourcesDir, 'Shop', 'Views');

    fs.mkdirSync(viewsDir, { recursive: true });

    fs.writeFileSync(
      path.join(viewsDir, 'CartView.swift'),
      [
        'import SwiftUI',
        '',
        'struct CartItem: Identifiable {',
        '  let id = UUID()',
        '  let name: String',
        '  let price: Double',
        '  let quantity: Int',
        '}',
        '',
        'final class CartViewModel: ObservableObject {',
        '  @Published var items: [CartItem] = []',
        '}',
        '',
        'struct CartView: View {',
        '  @StateObject var viewModel = CartViewModel()',
        '',
        '  var body: some View {',
        '    Text("Total: \(viewModel.items.reduce(0) { $0 + ($1.price * Double($1.quantity)) })")',
        '  }',
        '}'
      ].join('\n'),
      'utf8'
    );

    const analyzer = new SwiftImportGraphAnalyzer();
    const modules = await analyzer.analyzeDirectory(sourcesDir, sourcesDir);
    const result = new RuleEngine(mvvmConfig()).analyze(modules);

    const reduceViolation = result.violations.find(
      (v) =>
        v.type === ViolationType.MISPLACED_BUSINESS_LOGIC &&
        v.filePath.endsWith('CartView.swift') &&
        v.message.includes('Business calculation (.reduce)')
    );

    expect(reduceViolation).toBeDefined();
  });

  test('does not flag networking when it is inside ViewModel in the same file', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arclint-swift-antipattern-3-'));
    const sourcesDir = path.join(tempDir, 'Sources');
    const viewsDir = path.join(sourcesDir, 'Shop', 'Views');

    fs.mkdirSync(viewsDir, { recursive: true });

    fs.writeFileSync(
      path.join(viewsDir, 'ProfileScreen.swift'),
      [
        'import SwiftUI',
        '',
        'final class ProfileViewModel: ObservableObject {',
        '  func load() {',
        '    URLSession.shared.dataTask(with: URL(string: "https://api.example.com/profile")!) { _, _, _ in',
        '    }.resume()',
        '  }',
        '}',
        '',
        'struct ProfileView: View {',
        '  @StateObject private var viewModel = ProfileViewModel()',
        '',
        '  var body: some View {',
        '    Text("Profile")',
        '  }',
        '}'
      ].join('\n'),
      'utf8'
    );

    const analyzer = new SwiftImportGraphAnalyzer();
    const modules = await analyzer.analyzeDirectory(sourcesDir, sourcesDir);
    const result = new RuleEngine(mvvmConfig()).analyze(modules);

    const profileViolations = result.violations.filter(
      (v) => v.type === ViolationType.MISPLACED_BUSINESS_LOGIC && v.filePath.endsWith('ProfileScreen.swift')
    );

    expect(profileViolations.length).toBe(0);
  });
});
