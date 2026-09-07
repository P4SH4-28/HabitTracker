// ============================================================
// memoizedAvatarCircle — AvatarCircle için React.memo wrapper
// AvatarCircle bileşeni her render'de yeniden çizilmesini engeller.
// Sadece prop'lar değişince yeni render olur.
// ============================================================
import React from 'react';
import AvatarCircle from './AvatarCircle';

// React.memo: prop'lar aynı referans ise yeniden render edilmez.
// AvatarCircle'interno passed'ler (avatarId, size, ringColor vb.) değişmedikçe
// aynı referans ile render edilir, bu da ShopScreen'daki grid performansını artırır.
const MemoizedAvatarCircle = React.memo(function MemoizedAvatarCircle({
  avatarId,
  frameId,
  photo,
  size,
  ringColor,
  ...rest
}) {
  return <AvatarCircle
    avatarId={avatarId}
    frameId={frameId}
    photo={photo}
    size={size}
    ringColor={ringColor}
    {...rest}
  />;
});

export default MemoizedAvatarCircle;