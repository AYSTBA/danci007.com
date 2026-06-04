// 插入默认课程数据到 SQLite
import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'data', 'danci007.db');

if (!existsSync(dbPath)) {
  console.error('数据库不存在:', dbPath);
  process.exit(1);
}

const db = new Database(dbPath);

// 检查是否已有数据
const count = db.prepare('SELECT COUNT(*) as count FROM courses').get();
if (count.count > 0) {
  console.log('数据库已有', count.count, '条课程数据，跳过插入');
  db.close();
  process.exit(0);
}

// 插入默认 enrollment 课程（对应 /enrollment 路由）
const enrollmentCourse = {
  course_id: 'enroll',
  name: '单词突击007 - 英语课程报名',
  name_en: 'Word Blitz 007 - English Enrollment',
  subtitle: '让孩子爱上英语，科学高效记忆',
  subtitle_en: 'Make kids love English with scientific memory methods',
  description: '单词突击007采用自主研发的科学记忆系统，通过沉浸式教学法，让孩子在快乐中掌握英语单词。课程涵盖少儿英语启蒙、小学同步、初中提分、高中冲刺、成人商务英语、雅思托福备考等多个阶段。\n\n我们的特色：\n• 8年专注英语教育，累计培养学员超5000人\n• 自主研发的单词突击记忆系统，学习效率提升3倍\n• 小班制教学，每班不超过12人\n• 定期学习效果测评，家长实时掌握进度\n• 专业名师团队，TESOL认证教师',
  description_en: 'Word Blitz 007 uses a self-developed scientific memory system through immersive teaching, helping children master English words joyfully.',
  price: '2980',
  original_price: '3980',
  teacher_name: '李老师',
  teacher_name_en: 'Teacher Li',
  teacher_title: '金牌讲师 · TESOL认证',
  teacher_title_en: 'Gold Instructor · TESOL Certified',
  teacher_avatar: '/uploads/teacher-avatar-default.jpg',
  banner_image: '/uploads/banner-enrollment.jpg',
  features: JSON.stringify([
    { icon: '🧠', title: '科学记忆法', desc: '自主研发的记忆系统，效率提升3倍' },
    { icon: '👥', title: '小班制教学', desc: '每班不超过12人，充分关注每位学员' },
    { icon: '📊', title: '效果测评', desc: '定期测评，家长实时掌握学习进度' },
    { icon: '🏆', title: '名师团队', desc: 'TESOL认证教师，8年以上教学经验' },
  ]),
  active: 1,
};

// 插入 enrollment 课程
db.prepare(`
  INSERT INTO courses (
    course_id, name, name_en, subtitle, subtitle_en, description, description_en,
    price, original_price, teacher_name, teacher_name_en, teacher_title, teacher_title_en,
    teacher_avatar, banner_image, features, active
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  enrollmentCourse.course_id, enrollmentCourse.name, enrollmentCourse.name_en,
  enrollmentCourse.subtitle, enrollmentCourse.subtitle_en,
  enrollmentCourse.description, enrollmentCourse.description_en,
  enrollmentCourse.price, enrollmentCourse.original_price,
  enrollmentCourse.teacher_name, enrollmentCourse.teacher_name_en,
  enrollmentCourse.teacher_title, enrollmentCourse.teacher_title_en,
  enrollmentCourse.teacher_avatar, enrollmentCourse.banner_image,
  enrollmentCourse.features, enrollmentCourse.active
);

// 再插入几条具体课程
db.prepare(`
  INSERT INTO courses (course_id, name, subtitle, description, price, original_price, teacher_name, teacher_title, features, active)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  'kids-english',
  '少儿英语启蒙课',
  '3-6岁趣味英语启蒙',
  '专为3-6岁儿童设计的英语启蒙课程，采用沉浸式教学法，通过游戏、歌曲、故事等多元化教学方式，让孩子在快乐中爱上英语。',
  '2980', '3680', '李老师', '少儿英语专家 · 8年经验',
  JSON.stringify([
    { icon: '🎮', title: '游戏化教学', desc: '寓教于乐，在游戏中自然习得英语' },
    { icon: '🎵', title: '儿歌韵律', desc: '通过英文儿歌培养语感和发音' },
    { icon: '📖', title: '绘本阅读', desc: '原版英文绘本，培养阅读兴趣' },
  ]),
  1
);

db.prepare(`
  INSERT INTO courses (course_id, name, subtitle, description, price, original_price, teacher_name, teacher_title, features, active)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  'primary-english',
  '小学英语同步班',
  '紧扣课标，夯实基础',
  '紧扣课标大纲，同步学校进度，夯实听说读写基础。通过系统化的知识梳理和专项训练，助力孩子成绩稳步提升。',
  '3680', '4280', '张老师', '小学英语名师 · 10年经验',
  JSON.stringify([
    { icon: '📚', title: '同步教材', desc: '与学校教材同步，巩固课堂知识' },
    { icon: '✍️', title: '专项训练', desc: '听力、口语、阅读、写作全面提升' },
    { icon: '📈', title: '成绩追踪', desc: '定期测试，可视化学习进度报告' },
  ]),
  1
);

db.prepare(`
  INSERT INTO courses (course_id, name, subtitle, description, price, original_price, teacher_name, teacher_title, features, active)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  'middle-english',
  '初中英语提分班',
  '突破难点，快速提分',
  '针对性突破语法难点和阅读长难句，系统梳理中考高频考点。通过真题训练和技巧讲解，帮助学生快速提分。',
  '4280', '5280', '王老师', '中考英语专家 · 15年经验',
  JSON.stringify([
    { icon: '🎯', title: '考点梳理', desc: '系统梳理中考高频考点和易错点' },
    { icon: '📝', title: '真题训练', desc: '历年中考真题实战演练' },
    { icon: '⚡', title: '快速提分', desc: '技巧讲解，短期内提升成绩' },
  ]),
  1
);

console.log('✅ 成功插入', db.prepare('SELECT COUNT(*) as count FROM courses').get().count, '条课程数据');
db.close();
