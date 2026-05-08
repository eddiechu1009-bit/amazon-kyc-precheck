import type { ChecklistItem, WizardAnswers, Bilingual } from '../data/types';
import type { Lang } from '../i18n';

type Tx = (pair: Bilingual) => string;

/**
 * Build a human-friendly markdown report from the checklist.
 * Used by both "Copy" and "Download" actions.
 */
export function buildMarkdown(
  items: ChecklistItem[],
  answers: WizardAnswers,
  lang: Lang,
  tx: Tx,
): string {
  const isZh = lang === 'zh';
  const h = (s: string) => (isZh ? s : s);

  const answersLines = [
    isZh ? '## 你的回答' : '## Your answers',
    `- ${isZh ? '主體類型' : 'Entity type'}: ${answers.entity ?? '-'}`,
    `- ${isZh ? '國家 / 地區' : 'Country / region'}: ${answers.country ?? '-'}`,
    `- ${isZh ? '受益人數' : 'Beneficial owners'}: ${answers.boCount ?? '-'}`,
    `- ${isZh ? '銀行地區' : 'Bank region'}: ${answers.bank ?? '-'}`,
    `- ${isZh ? '近 30 天有資訊變更' : 'Info changed in last 30 days'}: ${answers.addressChanged ?? '-'}`,
  ];

  const groups: { priority: ChecklistItem['priority']; label: string }[] = [
    { priority: 'required', label: isZh ? '必要' : 'Required' },
    { priority: 'conditional', label: isZh ? '視情況' : 'Conditional' },
    { priority: 'recommended', label: isZh ? '建議' : 'Recommended' },
  ];

  const lines: string[] = [];
  lines.push(`# ${h('Pass KYC')} — ${isZh ? '文件檢查清單' : 'Document Checklist'}`);
  lines.push('');
  lines.push(
    isZh
      ? `> 產出時間：${new Date().toISOString().slice(0, 10)}。僅供參考，最終以 Amazon 審核為準。`
      : `> Generated: ${new Date().toISOString().slice(0, 10)}. For reference only; the final decision rests with Amazon.`,
  );
  lines.push('');
  lines.push(...answersLines);
  lines.push('');

  for (const g of groups) {
    const rows = items.filter((i) => i.priority === g.priority);
    if (rows.length === 0) continue;
    lines.push(`## ${g.label} (${rows.length})`);
    lines.push('');
    for (const item of rows) {
      lines.push(`### ☐ ${tx(item.title)}`);
      lines.push('');
      lines.push(tx(item.why));
      lines.push('');
      if (item.prepTips.length) {
        lines.push(isZh ? '**準備重點**' : '**Prep tips**');
        for (const p of item.prepTips) lines.push(`- ${tx(p)}`);
        lines.push('');
      }
      if (item.commonRejection.length) {
        lines.push(isZh ? '**常見退件原因**' : '**Common rejection reasons**');
        for (const r of item.commonRejection) lines.push(`- ${tx(r)}`);
        lines.push('');
      }
      if (item.sources?.length) {
        lines.push(isZh ? '**資料來源**' : '**Sources**');
        for (const s of item.sources) {
          const badge = s.type === 'official'
            ? (isZh ? '官方' : 'Official')
            : (isZh ? '經驗整理' : 'Experience');
          const suffix = s.url ? ` — ${s.url}` : '';
          lines.push(`- [${badge}] ${tx(s.label)}${suffix}`);
        }
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
