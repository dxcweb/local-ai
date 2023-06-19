from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Tuple
import os
from enum import Enum
from rembg import remove, new_session
from utils import get_download_path, generate_filename
import time
from sse_starlette.sse import EventSourceResponse
import json
router = APIRouter()


class ModelType(str, Enum):
    u2net = "u2net" # 通用模型
    u2net_human_seg = "u2net_human_seg" # 人像模型
    isnet_anime = "isnet-anime" # 动漫模型

class RembgModel(BaseModel):
    input: List[str]
    output: str = get_download_path()
    model: ModelType = ModelType.u2net
    alpha_matting: bool = False
    alpha_matting_foreground_threshold: int = 270
    alpha_matting_background_threshold: int = 20
    alpha_matting_erode_size: int = 11
    bgcolor: str | None = None
@router.post("/rembg")
async def rembgApi(data: RembgModel):
    # 获取文件名称
    async def event_generator():
        for input_path in data.input:
            filename = os.path.basename(input_path)
            bgcolor = None
            if data.bgcolor is not None:
                bgcolor = tuple(map(int,data.bgcolor.split(",")))
            output_path = generate_filename(os.path.join(data.output,filename))
            remove_bg(input_path,output_path,
                        model=data.model,
                        alpha_matting=data.alpha_matting,
                        alpha_matting_foreground_threshold=data.alpha_matting_foreground_threshold,
                        alpha_matting_background_threshold=data.alpha_matting_background_threshold,
                        alpha_matting_erode_size=data.alpha_matting_erode_size,
                        bgcolor=bgcolor
                    )
            yield {'data': json.dumps({"input":input_path,"output":output_path})}

    return EventSourceResponse(event_generator())

sessions= {}
def remove_bg(
    input_path, 
    output_path, 
    model:ModelType= ModelType.u2net,
    alpha_matting: bool = False,
    alpha_matting_foreground_threshold: int = 270,
    alpha_matting_background_threshold: int = 20,
    alpha_matting_erode_size: int = 11,
    bgcolor: Optional[Tuple[int, int, int, int]] = None
    ):
    if model not in sessions:
        sessions[model] = new_session(model)
  
    with open(input_path, 'rb') as i:
        with open(output_path, 'wb') as o:
            input = i.read()
            start_time = time.time()
            output = remove(input,
                            alpha_matting=alpha_matting,
                            alpha_matting_foreground_threshold=alpha_matting_foreground_threshold,
                            alpha_matting_background_threshold=alpha_matting_background_threshold,
                            alpha_matting_erode_size=alpha_matting_erode_size,
                            bgcolor=bgcolor,
                            post_process_mask=True,
                            session=sessions[model])
            end_time = time.time()
            execution_time = end_time - start_time  # 计算函数执行时间
            print("函数执行时间为: ", execution_time, "秒",alpha_matting)
            # output = remove(input, post_process_mask=True) # 对掩码进行后处理以获得更好的结果
            # output = remove(input, bgcolor=(255, 255, 255))   # 设置背景颜色
            o.write(output)


# uvicorn main:app --reload


@router.get("/test")
async def rembgApi():
    return {"message": "Hello World"}