"""Bounded JPEG evidence from the exact frame referenced by a passage."""
import base64
import cv2
import math


def attach_images(passages,image,sequence):
    height,width=image.shape[:2]
    for event in passages:
        if event['frame_sequence']!=sequence:continue
        images={}
        for kind in ('vehicle','plate'):
            box=event.pop('_'+kind+'_box',None)
            if not box or len(box)!=4 or not all(math.isfinite(x) for x in box):continue
            x1,y1,x2,y2=map(int,box);x1=max(0,x1);y1=max(0,y1);x2=min(width,x2);y2=min(height,y2)
            if x2<=x1 or y2<=y1:continue
            crop=image[y1:y2,x1:x2]
            scale=min(1.,640/max(crop.shape[:2]))
            if scale<1:crop=cv2.resize(crop,None,fx=scale,fy=scale,interpolation=cv2.INTER_AREA)
            ok,jpeg=cv2.imencode('.jpg',crop,[cv2.IMWRITE_JPEG_QUALITY,78])
            if ok and len(jpeg)<=300000:images[kind]=base64.b64encode(jpeg).decode('ascii')
        if images:event['_images']=images
    return passages
