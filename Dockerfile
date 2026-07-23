# 构建阶段：API 地址必须在 Vue 编译时注入，运行容器后不能再动态替换。
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./

# Vue CLI 在构建期读取 VUE_APP_*。默认 API 与外层 Nginx 同域，/flame/api/ 由外层转发至后端。
ARG VUE_APP_API_BASE_URL=/flame/api
ARG VUE_APP_SHOP_REDEEM_WINDOW_DAYS=7
ARG VUE_APP_PAGE_TITLE=燃动现象
ARG VUE_APP_DINGTALK_CORP_ID
ARG VUE_APP_DINGTALK_CLIENT_ID

# Compose 通过 build args 提供公开参数；这里导出后 Vue CLI 才会在构建期写入产物。
ENV VUE_APP_API_BASE_URL=${VUE_APP_API_BASE_URL} \
    VUE_APP_SHOP_REDEEM_WINDOW_DAYS=${VUE_APP_SHOP_REDEEM_WINDOW_DAYS} \
    VUE_APP_PAGE_TITLE=${VUE_APP_PAGE_TITLE} \
    VUE_APP_DINGTALK_CORP_ID=${VUE_APP_DINGTALK_CORP_ID} \
    VUE_APP_DINGTALK_CLIENT_ID=${VUE_APP_DINGTALK_CLIENT_ID}

RUN npm run build

# 运行阶段：仅保留构建后的静态文件和 Nginx。
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/ /usr/share/nginx/html/

EXPOSE 80
