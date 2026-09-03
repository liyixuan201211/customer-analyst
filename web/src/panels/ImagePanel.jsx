import React from 'react';
import { Card, Empty } from './ui.jsx';

export default function ImagePanel({ images, prompt }) {
  if (!images?.length) return <Empty text="暂无图片" />;
  return (
    <>
      {prompt && <Card className="mb-2 text-xs text-fg-2">提示词：{prompt}</Card>}
      {images.map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer"><img src={u} className="w-full rounded-xl border border-line mb-2" /></a>)}
    </>
  );
}
