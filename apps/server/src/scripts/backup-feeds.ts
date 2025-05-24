#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function backupFeeds() {
  try {
    console.log('正在导出订阅源数据...');

    // 获取所有订阅源
    const feeds = await prisma.feed.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 获取所有文章（为了数据完整性）
    const articles = await prisma.article.findMany({
      orderBy: {
        publishTime: 'desc',
      },
    });

    // 获取所有账号
    const accounts = await prisma.account.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        // 不导出token敏感信息
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const backupData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      data: {
        feeds,
        articles,
        accounts,
      },
      summary: {
        feedsCount: feeds.length,
        articlesCount: articles.length,
        accountsCount: accounts.length,
      },
    };

    // 创建备份目录
    const backupDir = path.join(__dirname, '../../../backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 生成备份文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(
      backupDir,
      `wewe-rss-backup-${timestamp}.json`,
    );

    // 写入备份文件
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8');

    console.log(`✅ 数据备份完成！`);
    console.log(`📁 备份文件：${backupFile}`);
    console.log(`📊 统计信息：`);
    console.log(`   - 订阅源：${feeds.length} 个`);
    console.log(`   - 文章：${articles.length} 篇`);
    console.log(`   - 账号：${accounts.length} 个`);

    return backupFile;
  } catch (error) {
    console.error('❌ 备份失败：', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  backupFeeds().catch(console.error);
}

export { backupFeeds };
