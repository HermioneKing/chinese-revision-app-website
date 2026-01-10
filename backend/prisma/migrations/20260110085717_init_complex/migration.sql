-- CreateTable
CREATE TABLE "AdvertisementClick" (
    "click_id" SERIAL NOT NULL,
    "advertisement_id" INTEGER,
    "student_id" INTEGER,
    "clicked_at" TIMESTAMP(3),
    "page" VARCHAR(255),
    "user_agent" TEXT,
    "ip_address" VARCHAR(45),

    CONSTRAINT "AdvertisementClick_pkey" PRIMARY KEY ("click_id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "plan_id" SERIAL NOT NULL,
    "plan_name" VARCHAR(255),
    "freeorpremiumorschool" VARCHAR(50),
    "function_1" TEXT,
    "function_2" TEXT,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("plan_id")
);

-- CreateTable
CREATE TABLE "Student" (
    "student_id" SERIAL NOT NULL,
    "username" VARCHAR(255),
    "nickname" VARCHAR(255),
    "login_auth" VARCHAR(50),
    "register_date" TIMESTAMP(3),
    "last_active" TIMESTAMP(3),
    "plan_id" INTEGER,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "StudentSubscription" (
    "student_id" INTEGER NOT NULL,
    "plan_id" INTEGER,
    "start_date" DATE,
    "end_date" DATE,

    CONSTRAINT "StudentSubscription_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "transaction_id" SERIAL NOT NULL,
    "student_id" INTEGER,
    "plan_id" INTEGER,
    "date" TIMESTAMP(3),
    "price" DECIMAL(10,2),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "StudentLoginGoogle" (
    "student_id" INTEGER NOT NULL,
    "google_id" VARCHAR(255),
    "email" VARCHAR(255),

    CONSTRAINT "StudentLoginGoogle_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "StudentLoginApple" (
    "student_id" INTEGER NOT NULL,
    "apple_id" VARCHAR(255),
    "email" VARCHAR(255),

    CONSTRAINT "StudentLoginApple_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "StudentLoginEmail" (
    "student_id" INTEGER NOT NULL,
    "email" VARCHAR(255),
    "password_hash" VARCHAR(255),

    CONSTRAINT "StudentLoginEmail_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "StudentActivityStats" (
    "student_id" INTEGER NOT NULL,
    "last_activity_date" TIMESTAMP(3),
    "consecutive_activity_days" INTEGER,
    "total_study_time" INTEGER,
    "questions_streak" INTEGER,

    CONSTRAINT "StudentActivityStats_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "School" (
    "school_id" SERIAL NOT NULL,
    "school" VARCHAR(255),

    CONSTRAINT "School_pkey" PRIMARY KEY ("school_id")
);

-- CreateTable
CREATE TABLE "Group" (
    "group_id" SERIAL NOT NULL,
    "group_name" VARCHAR(255),
    "school_id" INTEGER,
    "grade" VARCHAR(50),
    "class" VARCHAR(50),

    CONSTRAINT "Group_pkey" PRIMARY KEY ("group_id")
);

-- CreateTable
CREATE TABLE "SchoolStudent" (
    "student_id" INTEGER NOT NULL,
    "group_id" INTEGER,
    "school_id" INTEGER,

    CONSTRAINT "SchoolStudent_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "StudentGroupMapping" (
    "student_id" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,
    "join_at" DATE,

    CONSTRAINT "StudentGroupMapping_pkey" PRIMARY KEY ("student_id","group_id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "teacher_id" SERIAL NOT NULL,
    "username" VARCHAR(255),
    "password_hash" VARCHAR(255),
    "group_id" INTEGER,
    "email" VARCHAR(255),
    "school_id" INTEGER,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("teacher_id")
);

-- CreateTable
CREATE TABLE "TeacherGroupMapping" (
    "teacher_id" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,
    "join_at" DATE,
    "role" VARCHAR(50),

    CONSTRAINT "TeacherGroupMapping_pkey" PRIMARY KEY ("teacher_id","group_id")
);

-- CreateTable
CREATE TABLE "Passage" (
    "passage_id" SERIAL NOT NULL,
    "name" VARCHAR(255),
    "author" VARCHAR(255),
    "book" VARCHAR(255),
    "genre" VARCHAR(100),
    "dynasty" VARCHAR(100),
    "style" VARCHAR(100),
    "level" VARCHAR(50),
    "order_num" INTEGER,

    CONSTRAINT "Passage_pkey" PRIMARY KEY ("passage_id")
);

-- CreateTable
CREATE TABLE "QuestionInfo" (
    "question_id" SERIAL NOT NULL,
    "table_name" VARCHAR(100),
    "passage_id" INTEGER,
    "type" VARCHAR(50),

    CONSTRAINT "QuestionInfo_pkey" PRIMARY KEY ("question_id")
);

-- CreateTable
CREATE TABLE "Paragraph" (
    "paragraph_id" SERIAL NOT NULL,
    "question_id" INTEGER,
    "value" TEXT,
    "order_num" INTEGER,
    "passage_id" INTEGER,

    CONSTRAINT "Paragraph_pkey" PRIMARY KEY ("paragraph_id")
);

-- CreateTable
CREATE TABLE "Sentence" (
    "sentence_id" SERIAL NOT NULL,
    "question_id" INTEGER,
    "paragraph_id" INTEGER,
    "value" TEXT,
    "translation" TEXT,
    "order_num" INTEGER,
    "passage_id" INTEGER,

    CONSTRAINT "Sentence_pkey" PRIMARY KEY ("sentence_id")
);

-- CreateTable
CREATE TABLE "ShortSentence" (
    "short_sentence_id" SERIAL NOT NULL,
    "question_id" INTEGER,
    "sentence_id" INTEGER,
    "value" TEXT,
    "order_num" INTEGER,
    "passage_id" INTEGER,

    CONSTRAINT "ShortSentence_pkey" PRIMARY KEY ("short_sentence_id")
);

-- CreateTable
CREATE TABLE "Word" (
    "word_id" SERIAL NOT NULL,
    "question_id" INTEGER,
    "short_sentence_id" INTEGER,
    "order_num" INTEGER,
    "value" VARCHAR(100),
    "part_of_speech" VARCHAR(50),
    "meaning_0" TEXT,
    "meaning_1" TEXT,
    "meaning_2" TEXT,
    "tone" VARCHAR(50),
    "synonym_0" VARCHAR(100),
    "synonym_1" VARCHAR(100),
    "synonym_2" VARCHAR(100),
    "synonym_3" VARCHAR(100),
    "synonym_4" VARCHAR(100),
    "synonym_5" VARCHAR(100),
    "passage_id" INTEGER,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("word_id")
);

-- CreateTable
CREATE TABLE "MultipleChoice" (
    "question_id" INTEGER NOT NULL,
    "question" TEXT,
    "correct" VARCHAR(255),
    "wrong_1" VARCHAR(255),
    "wrong_2" VARCHAR(255),
    "wrong_3" VARCHAR(255),
    "correct_explain" TEXT,
    "wrong_explain_1" TEXT,
    "wrong_explain_2" TEXT,
    "wrong_explain_3" TEXT,
    "level" VARCHAR(50),
    "passage_id" INTEGER,

    CONSTRAINT "MultipleChoice_pkey" PRIMARY KEY ("question_id")
);

-- CreateTable
CREATE TABLE "TranslationQuestion" (
    "sentence_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "question" TEXT,
    "correct_answer" TEXT,
    "wrong_answer_1" TEXT,
    "wrong_answer_2" TEXT,
    "order_num" INTEGER,
    "level" VARCHAR(50),

    CONSTRAINT "TranslationQuestion_pkey" PRIMARY KEY ("sentence_id","question_id")
);

-- CreateTable
CREATE TABLE "QuestionRecord" (
    "record_id" SERIAL NOT NULL,
    "questions_id" INTEGER,
    "student_id" INTEGER,
    "answer" TEXT,
    "is_correct" BOOLEAN,
    "tested_date" TIMESTAMP(3),
    "is_uploaded" BOOLEAN,
    "duration" INTEGER,

    CONSTRAINT "QuestionRecord_pkey" PRIMARY KEY ("record_id")
);

-- CreateTable
CREATE TABLE "Complete" (
    "state_id" SERIAL NOT NULL,
    "student_id" INTEGER,
    "passage_id" INTEGER,
    "duration" INTEGER,
    "score" DECIMAL(5,2),
    "percentage" DECIMAL(5,2),
    "date_time" TIMESTAMP(3),

    CONSTRAINT "Complete_pkey" PRIMARY KEY ("state_id")
);

-- CreateTable
CREATE TABLE "ChallengeModeRecord" (
    "student_id" INTEGER NOT NULL,
    "best_score" INTEGER,
    "best_time_used" INTEGER,
    "number_of_question" INTEGER,
    "number_of_correct" INTEGER,
    "best_timestamp" TIMESTAMP(3),
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "ChallengeModeRecord_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "Grading" (
    "grade" VARCHAR(50) NOT NULL,
    "completed_question" INTEGER,
    "correct_percentage" DECIMAL(5,2),

    CONSTRAINT "Grading_pkey" PRIMARY KEY ("grade")
);

-- CreateTable
CREATE TABLE "QuestionReport" (
    "passage_id" INTEGER NOT NULL,
    "numbers_of_word_explanation" INTEGER,
    "numbers_of_word_rearrange" INTEGER,
    "numbers_of_sentence_rearrange" INTEGER,
    "number_of_writing_skill" INTEGER,
    "total" INTEGER,

    CONSTRAINT "QuestionReport_pkey" PRIMARY KEY ("passage_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_username_key" ON "Student"("username");

-- CreateIndex
CREATE UNIQUE INDEX "StudentLoginGoogle_google_id_key" ON "StudentLoginGoogle"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "StudentLoginApple_apple_id_key" ON "StudentLoginApple"("apple_id");

-- CreateIndex
CREATE UNIQUE INDEX "StudentLoginEmail_email_key" ON "StudentLoginEmail"("email");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("plan_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSubscription" ADD CONSTRAINT "StudentSubscription_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSubscription" ADD CONSTRAINT "StudentSubscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("plan_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("student_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("plan_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLoginGoogle" ADD CONSTRAINT "StudentLoginGoogle_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLoginApple" ADD CONSTRAINT "StudentLoginApple_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLoginEmail" ADD CONSTRAINT "StudentLoginEmail_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentActivityStats" ADD CONSTRAINT "StudentActivityStats_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("school_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolStudent" ADD CONSTRAINT "SchoolStudent_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolStudent" ADD CONSTRAINT "SchoolStudent_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("group_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolStudent" ADD CONSTRAINT "SchoolStudent_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("school_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGroupMapping" ADD CONSTRAINT "StudentGroupMapping_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGroupMapping" ADD CONSTRAINT "StudentGroupMapping_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("group_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("group_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("school_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherGroupMapping" ADD CONSTRAINT "TeacherGroupMapping_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "Teacher"("teacher_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherGroupMapping" ADD CONSTRAINT "TeacherGroupMapping_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("group_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionInfo" ADD CONSTRAINT "QuestionInfo_passage_id_fkey" FOREIGN KEY ("passage_id") REFERENCES "Passage"("passage_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paragraph" ADD CONSTRAINT "Paragraph_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "QuestionInfo"("question_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paragraph" ADD CONSTRAINT "Paragraph_passage_id_fkey" FOREIGN KEY ("passage_id") REFERENCES "Passage"("passage_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sentence" ADD CONSTRAINT "Sentence_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "QuestionInfo"("question_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sentence" ADD CONSTRAINT "Sentence_paragraph_id_fkey" FOREIGN KEY ("paragraph_id") REFERENCES "Paragraph"("paragraph_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sentence" ADD CONSTRAINT "Sentence_passage_id_fkey" FOREIGN KEY ("passage_id") REFERENCES "Passage"("passage_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortSentence" ADD CONSTRAINT "ShortSentence_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "QuestionInfo"("question_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortSentence" ADD CONSTRAINT "ShortSentence_sentence_id_fkey" FOREIGN KEY ("sentence_id") REFERENCES "Sentence"("sentence_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortSentence" ADD CONSTRAINT "ShortSentence_passage_id_fkey" FOREIGN KEY ("passage_id") REFERENCES "Passage"("passage_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "QuestionInfo"("question_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_short_sentence_id_fkey" FOREIGN KEY ("short_sentence_id") REFERENCES "ShortSentence"("short_sentence_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_passage_id_fkey" FOREIGN KEY ("passage_id") REFERENCES "Passage"("passage_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MultipleChoice" ADD CONSTRAINT "MultipleChoice_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "QuestionInfo"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MultipleChoice" ADD CONSTRAINT "MultipleChoice_passage_id_fkey" FOREIGN KEY ("passage_id") REFERENCES "Passage"("passage_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslationQuestion" ADD CONSTRAINT "TranslationQuestion_sentence_id_fkey" FOREIGN KEY ("sentence_id") REFERENCES "Sentence"("sentence_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslationQuestion" ADD CONSTRAINT "TranslationQuestion_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "QuestionInfo"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionRecord" ADD CONSTRAINT "QuestionRecord_questions_id_fkey" FOREIGN KEY ("questions_id") REFERENCES "QuestionInfo"("question_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionRecord" ADD CONSTRAINT "QuestionRecord_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("student_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complete" ADD CONSTRAINT "Complete_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("student_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complete" ADD CONSTRAINT "Complete_passage_id_fkey" FOREIGN KEY ("passage_id") REFERENCES "Passage"("passage_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeModeRecord" ADD CONSTRAINT "ChallengeModeRecord_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionReport" ADD CONSTRAINT "QuestionReport_passage_id_fkey" FOREIGN KEY ("passage_id") REFERENCES "Passage"("passage_id") ON DELETE RESTRICT ON UPDATE CASCADE;
