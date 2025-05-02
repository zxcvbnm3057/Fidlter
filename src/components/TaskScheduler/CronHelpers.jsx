import * as cronParser from 'cron-parser';
import cronstrue from 'cronstrue/i18n';

// 使用cron-parser检查cron表达式是否有效
export const isValidCron = (cronExpression) => {
    if (!cronExpression || cronExpression.trim() === '') return false;

    try {
        // 尝试解析cron表达式，如果成功则表达式有效
        cronParser.CronExpressionParser.parse(cronExpression);
        return true;
    } catch (e) {
        return false;
    }
};

// 将cron表达式转换为人类可读的中文描述
export const cronToHumanReadable = (cronExpression) => {
    if (!isValidCron(cronExpression)) return "无效的cron表达式";

    try {
        // 使用cronstrue库将cron表达式转换为中文描述
        return cronstrue.toString(cronExpression, { locale: 'zh_CN' });
    } catch (e) {
        return "无法解析的cron表达式";
    }
};

// 预测下次执行时间
export const getNextRunTime = (cronExpression) => {
    if (!isValidCron(cronExpression)) return "无法预测";

    try {
        // 使用cron-parser获取下次执行时间
        const interval = cronParser.parseExpression(cronExpression);
        const nextDate = interval.next().toDate();

        if (!nextDate) return "无法预测";

        // 格式化为中文本地时间
        return nextDate.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    } catch (e) {
        return "无法预测";
    }
};