// Runnable with: node --import tsx --test src/theme/variants.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buttonClasses,
  buttonLabelColor,
  avatarRingClass,
  toggleTrackClass,
  AVATAR_PX,
} from './variants.ts';

test('primary/secondary buttons meet the 56px CTA target', () => {
  assert.match(buttonClasses('primary'), /min-h-\[56px\]/);
  assert.match(buttonClasses('secondary'), /min-h-\[56px\]/);
});

test('voice button is a 72px circle, icon button a 48px circle', () => {
  assert.match(buttonClasses('voice'), /h-\[72px\] w-\[72px\] rounded-full/);
  assert.match(buttonClasses('icon'), /h-\[48px\] w-\[48px\] rounded-full/);
});

test('disabled buttons get a dimmed class', () => {
  assert.match(buttonClasses('primary', true), /opacity-40/);
  assert.doesNotMatch(buttonClasses('primary', false), /opacity-40/);
});

test('label color meets contrast per variant', () => {
  assert.equal(buttonLabelColor('primary'), 'primary');
  assert.equal(buttonLabelColor('secondary'), 'accent');
});

test('avatar ring encodes partner identity (A coral, B gold)', () => {
  assert.match(avatarRingClass('A'), /border-accent/);
  assert.match(avatarRingClass('B'), /border-secondary/);
  assert.match(avatarRingClass(), /border-border/);
});

test('toggle track reflects on/off state', () => {
  assert.match(toggleTrackClass(true), /bg-accent/);
  assert.match(toggleTrackClass(false), /bg-border/);
});

test('avatar sizes follow the 8px-derived scale', () => {
  assert.deepEqual(AVATAR_PX, { sm: 32, md: 48, lg: 72 });
});
