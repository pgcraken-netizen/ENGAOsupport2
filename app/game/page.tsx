import GravityGame from './GravityGame';

export const metadata = {
  title: '重力反転プラットフォーマー',
  description: '重力を操って障害物を避けながらゴールを目指せ！',
};

export default function GamePage() {
  return <GravityGame />;
}
