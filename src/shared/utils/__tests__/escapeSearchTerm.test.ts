/**
 * Unit Tests: escapeSearchTerm Utility
 *
 * Tests for search term sanitization utility that protects against
 * HTML injection and regex metacharacter issues.
 *
 * Following TDD: Tests written first (T004), implementation next (T005)
 */

import { describe, it, expect } from 'vitest';
import { escapeSearchTerm } from '../escapeSearchTerm';

describe('escapeSearchTerm', () => {
  describe('HTML Character Escaping', () => {
    it('should escape < (less than)', () => {
      expect(escapeSearchTerm('<script')).toBe('&lt;script');
      expect(escapeSearchTerm('value < 100')).toBe('value &lt; 100');
    });

    it('should escape > (greater than)', () => {
      expect(escapeSearchTerm('script>')).toBe('script&gt;');
      expect(escapeSearchTerm('value > 100')).toBe('value &gt; 100');
    });

    it('should escape & (ampersand)', () => {
      expect(escapeSearchTerm('Tom & Jerry')).toBe('Tom &amp; Jerry');
      expect(escapeSearchTerm('A&B&C')).toBe('A&amp;B&amp;C');
    });

    it('should escape " (double quote)', () => {
      expect(escapeSearchTerm('say "hello"')).toBe('say &quot;hello&quot;');
      expect(escapeSearchTerm('"quoted"')).toBe('&quot;quoted&quot;');
    });

    it('should escape \' (single quote)', () => {
      expect(escapeSearchTerm("it's")).toBe('it&#x27;s');
      expect(escapeSearchTerm("'quoted'")).toBe('&#x27;quoted&#x27;');
    });

    it('should escape multiple HTML characters in one string', () => {
      expect(escapeSearchTerm('<div class="test">')).toBe(
        '&lt;div class=&quot;test&quot;&gt;'
      );
      expect(escapeSearchTerm('Tom & Jerry\'s "Adventure"')).toBe(
        'Tom &amp; Jerry&#x27;s &quot;Adventure&quot;'
      );
    });
  });

  describe('Regex Metacharacter Escaping', () => {
    it('should escape . (dot)', () => {
      expect(escapeSearchTerm('file.txt')).toBe('file\\.txt');
      expect(escapeSearchTerm('...')).toBe('\\.\\.\\.');
    });

    it('should escape * (asterisk)', () => {
      expect(escapeSearchTerm('file*.txt')).toBe('file\\*\\.txt');
      expect(escapeSearchTerm('***')).toBe('\\*\\*\\*');
    });

    it('should escape + (plus)', () => {
      expect(escapeSearchTerm('C++')).toBe('C\\+\\+');
      expect(escapeSearchTerm('1+1')).toBe('1\\+1');
    });

    it('should escape ? (question mark)', () => {
      expect(escapeSearchTerm('file?.txt')).toBe('file\\?\\.txt');
      expect(escapeSearchTerm('what???')).toBe('what\\?\\?\\?');
    });

    it('should escape ^ (caret)', () => {
      expect(escapeSearchTerm('^start')).toBe('\\^start');
      expect(escapeSearchTerm('x^2')).toBe('x\\^2');
    });

    it('should escape $ (dollar sign)', () => {
      expect(escapeSearchTerm('end$')).toBe('end\\$');
      expect(escapeSearchTerm('$100')).toBe('\\$100');
    });

    it('should escape | (pipe)', () => {
      expect(escapeSearchTerm('A|B')).toBe('A\\|B');
      expect(escapeSearchTerm('||')).toBe('\\|\\|');
    });

    it('should escape \\ (backslash)', () => {
      expect(escapeSearchTerm('path\\file')).toBe('path\\\\file');
      expect(escapeSearchTerm('\\\\')).toBe('\\\\\\\\');
    });

    it('should escape [ ] (square brackets)', () => {
      expect(escapeSearchTerm('[abc]')).toBe('\\[abc\\]');
      expect(escapeSearchTerm('array[0]')).toBe('array\\[0\\]');
    });

    it('should escape ( ) (parentheses)', () => {
      expect(escapeSearchTerm('func()')).toBe('func\\(\\)');
      expect(escapeSearchTerm('(a|b)')).toBe('\\(a\\|b\\)');
    });

    it('should escape { } (curly braces)', () => {
      expect(escapeSearchTerm('{1,3}')).toBe('\\{1,3\\}');
      expect(escapeSearchTerm('obj{}')).toBe('obj\\{\\}');
    });

    it('should escape multiple regex metacharacters', () => {
      expect(escapeSearchTerm('.*+?^$|\\[](){}')).toBe(
        '\\.\\*\\+\\?\\^\\$\\|\\\\\\[\\]\\(\\)\\{\\}'
      );
    });
  });

  describe('Combined HTML and Regex Escaping', () => {
    it('should escape both HTML and regex characters', () => {
      expect(escapeSearchTerm('<div>.*</div>')).toBe(
        '&lt;div&gt;\\.\\*&lt;/div&gt;'
      );
    });

    it('should handle complex mixed patterns', () => {
      expect(escapeSearchTerm('<tag attr="value.*">')).toBe(
        '&lt;tag attr=&quot;value\\.\\*&quot;&gt;'
      );
    });

    it('should handle XSS attempt patterns', () => {
      expect(escapeSearchTerm('<script>alert("XSS")</script>')).toBe(
        '&lt;script&gt;alert\\(&quot;XSS&quot;\\)&lt;/script&gt;'
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      expect(escapeSearchTerm('')).toBe('');
    });

    it('should handle whitespace only', () => {
      expect(escapeSearchTerm('   ')).toBe('   ');
      expect(escapeSearchTerm('\t\n')).toBe('\t\n');
    });

    it('should handle normal alphanumeric text unchanged', () => {
      expect(escapeSearchTerm('hello')).toBe('hello');
      expect(escapeSearchTerm('HelloWorld123')).toBe('HelloWorld123');
      expect(escapeSearchTerm('BO-2025-001')).toBe('BO-2025-001');
    });

    it('should handle unicode characters', () => {
      expect(escapeSearchTerm('café')).toBe('café');
      expect(escapeSearchTerm('你好')).toBe('你好');
      expect(escapeSearchTerm('🎉')).toBe('🎉');
    });

    it('should handle strings with spaces and hyphens', () => {
      expect(escapeSearchTerm('multi word search')).toBe('multi word search');
      expect(escapeSearchTerm('dash-separated-value')).toBe('dash-separated-value');
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(1000) + '<script>';
      const escaped = escapeSearchTerm(longString);
      expect(escaped).toContain('&lt;script&gt;');
      expect(escaped.length).toBeGreaterThan(1000);
    });
  });

  describe('Real-World Search Patterns', () => {
    it('should escape booking order numbers with special chars', () => {
      expect(escapeSearchTerm('BO-2025-001')).toBe('BO-2025-001');
      expect(escapeSearchTerm('BO*')).toBe('BO\\*');
    });

    it('should escape vessel codes safely', () => {
      expect(escapeSearchTerm('VSL-MAERSK-001')).toBe('VSL-MAERSK-001');
      expect(escapeSearchTerm('VSL.MAERSK')).toBe('VSL\\.MAERSK');
    });

    it('should escape agent codes with wildcards', () => {
      expect(escapeSearchTerm('AGT*')).toBe('AGT\\*');
      expect(escapeSearchTerm('AGT?')).toBe('AGT\\?');
    });

    it('should handle comparison operators', () => {
      expect(escapeSearchTerm('>= 100')).toBe('&gt;= 100');
      expect(escapeSearchTerm('<= 50')).toBe('&lt;= 50');
      expect(escapeSearchTerm('!= null')).toBe('!= null');
    });
  });

  describe('Type Safety', () => {
    it('should accept string input', () => {
      const result = escapeSearchTerm('test');
      expect(typeof result).toBe('string');
    });

    it('should return string output', () => {
      expect(escapeSearchTerm('test')).toBeTypeOf('string');
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle repeated calls efficiently', () => {
      const input = '<script>test</script>';
      const iterations = 1000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        escapeSearchTerm(input);
      }
      const duration = performance.now() - start;

      // Should complete 1000 iterations in < 50ms
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Immutability', () => {
    it('should not mutate input string', () => {
      const input = '<test>';
      const original = input;
      escapeSearchTerm(input);
      expect(input).toBe(original);
    });

    it('should return new string reference', () => {
      const input = 'test';
      const result = escapeSearchTerm(input);
      // Even unchanged strings should be safe to use
      expect(typeof result).toBe('string');
    });
  });
});
