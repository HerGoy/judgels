import { Button, Callout, HTMLTable, Intent } from '@blueprintjs/core';
import { Book, Edit, Plus } from '@blueprintjs/icons';
import { Flex } from '@blueprintjs/labs';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { Alias } from '../../../../components/forms/validations';
import {
  chapterLessonsQueryOptions,
  setChapterLessonsMutationOptions,
} from '../../../../modules/queries/chapterLesson';
import ChapterLessonsEditForm from '../ChapterLessonsEditForm/ChapterLessonsEditForm';

import * as toastActions from '../../../../modules/toast/toastActions';

export function ChapterLessonsSection({ chapter }) {
  const { data: response } = useSuspenseQuery(chapterLessonsQueryOptions(chapter.jid));
  const setLessonsMutation = useMutation(setChapterLessonsMutationOptions(chapter.jid));

  const [isEditing, setIsEditing] = useState(false);

  const updateLessons = data => {
    const lessons = deserializeLessons(data.lessons);
    setLessonsMutation.mutate(lessons, {
      onSuccess: () => {
        toastActions.showSuccessToast('Chapter lessons updated.');
        setIsEditing(false);
      },
      onError: err => {
        toastActions.showErrorToast(
          err?.response?.data?.message || err?.message || 'Failed to update lessons. Make sure the lesson slug exists.'
        );
      },
    });
  };

  const renderEditButton = () => {
    return (
      !isEditing && (
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/admin/lessons">
            <Button small icon={<Book />} text="Kelola Lesson" />
          </Link>
          <Button small intent={Intent.PRIMARY} icon={<Edit />} onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        </div>
      )
    );
  };

  const renderContent = () => {
    if (isEditing) {
      const initialValues = { lessons: serializeLessons(response.data, response.lessonsMap) };
      return (
        <div>
          <Callout intent={Intent.PRIMARY} style={{ marginBottom: 12 }}>
            Masukkan satu materi pelajaran per baris dengan format <code>alias,slug</code>. Contoh: <code>A,pengenalan-cpp</code>.
            Pastikan lesson dengan slug tersebut sudah dibuat terlebih dahulu di menu <strong>Lessons</strong>.
          </Callout>
          <ChapterLessonsEditForm
            initialValues={initialValues}
            validator={validateLessons}
            onSubmit={updateLessons}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      );
    }
    const { data, lessonsMap } = response;
    if (data.length === 0) {
      return (
        <p style={{ color: '#5c7080', margin: '8px 0' }}>
          <em>Belum ada materi pembelajaran (lessons) di bab ini. Klik Edit atau Kelola Lesson untuk menambahkan materi.</em>
        </p>
      );
    }
    const rows = data.map(lesson => (
      <tr key={lesson.lessonJid}>
        <td>{lesson.alias}</td>
        <td>{lessonsMap[lesson.lessonJid] && lessonsMap[lesson.lessonJid].slug}</td>
      </tr>
    ));
    return (
      <HTMLTable striped className="table-list-condensed">
        <thead>
          <tr>
            <th style={{ width: '50px' }}>Alias</th>
            <th>Slug</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </HTMLTable>
    );
  };

  return (
    <div>
      <Flex asChild justifyContent="space-between" alignItems="baseline">
        <h4>
          <span>Materi Belajar (Lessons)</span>
          {renderEditButton()}
        </h4>
      </Flex>
      {renderContent()}
    </div>
  );
}

function serializeLessons(lessons, lessonsMap) {
  return lessons.map(c => `${c.alias},${lessonsMap[c.lessonJid].slug}`).join('\n');
}

function deserializeLessons(lessons) {
  return lessons
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s.split(','))
    .map(s => s.map(t => t.trim()))
    .map(s => ({
      alias: s[0],
      slug: s[1],
    }));
}

function validateLessons(value) {
  const lessons = value
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s.split(','))
    .map(s => s.map(t => t.trim()));

  const aliases = [];
  const slugs = [];

  for (const c of lessons) {
    if (c.length !== 2) {
      return 'Each line must contain 2 comma-separated elements';
    }
    const alias = c[0];
    const aliasValidation = Alias(alias);
    if (aliasValidation) {
      return 'Lesson aliases: ' + aliasValidation;
    }

    const slug = c[1];

    aliases.push(alias);
    slugs.push(slug);
  }

  if (new Set(aliases).size !== aliases.length) {
    return 'Lesson aliases must be unique';
  }
  if (new Set(slugs).size !== slugs.length) {
    return 'Lesson slugs must be unique';
  }

  return undefined;
}
