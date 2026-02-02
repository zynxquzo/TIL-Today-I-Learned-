# [TIL] PostgreSQL 기초와 world 샘플 데이터를 활용한 데이터 조회 실습

## 1. 데이터베이스 환경 및 테이블 구조 이해
**사용 데이터셋**: world sample database (PostgreSQL 전용)

**핵심 테이블**:
- **city**: 전 세계 도시 정보 (이름, 국가코드, 인구수 등)
- **country**: 국가 정보 (이름, 대륙, 면적, 독립 연도, GNP, 기대수명 등)

## 2. 조건 필터링과 비교 연산자 (WHERE)
데이터베이스에서 원하는 조건의 행만 추출하는 가장 기본적인 방법입니다.

- **수치 비교**: `population >= 8000000`과 같이 크거나 같음 연산자를 사용하여 대도시 정보를 조회합니다.
- **문자열 일치**: `countrycode = 'KOR'`와 같이 특정 국가 코드를 정확히 지정하여 데이터를 필터링합니다.
- **다중 조건 (AND/OR)**: `continent = 'Asia' AND region != 'Southeast Asia'` 처럼 여러 조건을 논리 연산자로 결합하여 정교한 검색이 가능합니다.

## 3. 유연한 검색을 위한 연산자 활용
**패턴 매칭 (LIKE)**:
- `'San%'`: 'San'으로 시작하는 모든 이름 조회
- `'A%a'`: 'A'로 시작해서 'a'로 끝나는 이름 조회

**범위 및 집합 검색**:
- **BETWEEN A AND B**: 특정 범위 내의 값 조회 (예: 인구 100만~200만 사이)
- **IN ('KOR', 'JPN', 'CHN')**: 리스트 내 포함된 값 중 하나라도 일치하는 경우 조회

**결측치 처리 (IS NULL)**: 데이터가 비어 있는 상태를 찾을 때는 `=`가 아닌 `IS NULL` 연산자를 사용합니다. (예: 기대수명 데이터가 없는 국가)

## 4. 결과 정렬 및 출력 제한 (ORDER BY & LIMIT)
조회된 데이터를 사용자 요구에 맞게 나열하고 개수를 조절하는 방법입니다.

- **복합 정렬**: `ORDER BY continent, gnp DESC`를 사용하여 대륙별로 묶은 뒤 그 안에서 GNP가 높은 순서대로 정렬합니다.
- **NULL 값 제어**: `NULLS LAST` 옵션을 사용하면 정렬 시 데이터가 없는(NULL) 행을 결과의 맨 마지막에 배치할 수 있습니다.

**페이징 처리 (Paging)**:
- **LIMIT**: 출력할 행의 개수 제한 (예: 하위 5개 도시)
- **OFFSET**: 시작 위치를 지정 (예: `LIMIT 10 OFFSET 10`은 11위부터 20위까지의 국가를 의미)

## 5. 실습 쿼리 전체 모음
```sql
-- 1. 인구가 800만 이상인 도시의 name, population을 조회하시오
SELECT name, population 
FROM city 
WHERE population >= 8000000;

-- 2. 한국(KOR)에 있는 도시의 name, countrycode를 조회하시오
SELECT name, countrycode 
FROM city 
WHERE countrycode = 'KOR';

-- 3. 유럽 대륙에 속한 나라들의 name과 region을 조회하시오.
SELECT name, region 
FROM country
WHERE continent = 'Europe';

-- 4. 이름이 'San'으로 시작하는 도시의 name을 조회하시오
SELECT name
FROM city
WHERE name LIKE 'San%';

-- 5. 독립 연도(IndepYear)가 1900년 이후인 나라의 name, indepyear를 조회하시오.
SELECT name, indepyear
FROM country
WHERE indepyear >= 1900;

-- 6. 인구가 100만에서 200만 사이인 한국 도시의 name을 조회하시오
SELECT name
FROM city
WHERE population BETWEEN 1000000 AND 2000000 AND countrycode = 'KOR';

-- 7. 인구가 500만 이상인 한국, 일본, 중국의 도시의 name, countrycode, population 을 조회하시오
SELECT name, countrycode, population
FROM city
WHERE population >= 5000000 AND countrycode IN ('KOR', 'JPN', 'CHN');

-- 8. 도시 이름이 'A'로 시작하고 'a'로 끝나는 도시의 name을 조회하시오.
SELECT name
FROM city
WHERE name LIKE 'A%a';

-- 9. 동남아시아(Southeast Asia) 지역(Region)에 속하지 않는 아시아(Asia) 대륙 나라들의 name, region을 조회하시오.
SELECT name, region
FROM country
WHERE continent = 'Asia' AND region != 'Southeast Asia';

-- 10. 오세아니아 대륙(continent = Oceania)에서 예상 수명(lifeexpectancy)의 데이터가 없는 나라의 name, lifeexpectancy, continent를 조회하시오.
SELECT name, lifeexpectancy, continent
FROM country
WHERE continent = 'Oceania' AND lifeexpectancy IS NULL;

-- 11. country 테이블에서 대륙별로 정렬하고, 같은 대륙 내에서는 GNP가 높은 순으로 정렬하여 name, continent, GNP을 조회하시오.
SELECT name, continent, gnp
FROM country
ORDER BY continent, gnp DESC;

-- 12. country 테이블에서 기대수명이 높은 순으로 정렬하되, NULL값은 마지막에 나오도록 정렬하여 name, lifeexpectancy을 조회하시오.
SELECT name, lifeexpectancy
FROM country
ORDER BY lifeexpectancy DESC NULLS LAST;

-- 13. city 테이블에서 인구수가 가장 적은 도시 5개를 조회하시오.
SELECT name, population
FROM city
ORDER BY population
LIMIT 5;

-- 14. country 테이블에서 면적(SurfaceArea)이 가장 넓은 순서대로 11위부터 20위까지의 국가를 조회하시오.
SELECT name, surfacearea
FROM country
ORDER BY surfacearea DESC
LIMIT 10 OFFSET 10;

-- 15. country 테이블에서 기대수명이 높은 순서대로 1위부터 5위까지의 국가를 조회하시오.
SELECT name, lifeexpectancy
FROM country
ORDER BY lifeexpectancy DESC NULLS LAST
LIMIT 5;
```

## 6. 학습 포인트 (Troubleshooting)
**대소문자 구분**: PostgreSQL은 문자열 비교 시 대소문자를 구분하므로 `'kor'`와 `'KOR'`는 다른 결과가 나옵니다. 대소문자 무시 검색이 필요하면 `ILIKE`를 사용할 수 있습니다.

**NULL의 정렬**: 기본적으로 `DESC` 정렬 시 NULL 값이 가장 먼저 나올 수 있으므로, 보고서 형태의 데이터를 뽑을 때는 `NULLS LAST` 사용 습관이 중요합니다.