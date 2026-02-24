# [TIL] PostgreSQL 집계 함수와 JOIN을 활용한 데이터 분석 실습

## 1. 데이터베이스 환경 및 테이블 구조 이해
**사용 데이터셋**: 
- **world sample database**: 국가, 도시, 언어 정보
- **dvdrental database**: 영화 대여점 관리 시스템

**핵심 테이블**:
- **city**: 전 세계 도시 정보 (이름, 국가코드, 인구수, district 등)
- **country**: 국가 정보 (이름, 대륙, GNP, 기대수명, 수도 등)
- **countrylanguage**: 국가별 사용 언어 정보
- **film**: 영화 정보 (제목, 등급, 대여료, 상영시간 등)
- **actor**: 배우 정보
- **film_actor**: 영화-배우 연결 테이블 (다대다 관계)

## 2. 집계 함수와 GROUP BY의 이해
데이터를 그룹화하여 통계 정보를 추출하는 핵심 기능입니다.

**기본 집계 함수**:
- `COUNT(*)`: 그룹 내 행의 개수
- `SUM(column)`: 합계
- `AVG(column)`: 평균
- `MIN(column)`: 최솟값
- `MAX(column)`: 최댓값

**GROUP BY 규칙**:
- SELECT에 있는 집계 함수가 아닌 모든 컬럼은 GROUP BY에도 포함되어야 합니다.
- 예: `SELECT rating, COUNT(*)` → `GROUP BY rating` 필수

## 3. HAVING절을 이용한 그룹 필터링
WHERE와 HAVING의 차이를 명확히 이해하는 것이 중요합니다.

**WHERE vs HAVING**:
- **WHERE**: 그룹화 **전** 개별 행을 필터링
- **HAVING**: 그룹화 **후** 집계 결과를 필터링

**실행 순서**:
```
FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY
```

**HAVING 활용 예시**:
```sql
-- 도시가 10개 이상인 국가만 조회
SELECT countrycode, COUNT(*) AS city_count
FROM city
GROUP BY countrycode
HAVING COUNT(*) >= 10;
```

이 쿼리는 먼저 국가별로 그룹화한 후, 도시 수가 10개 이상인 그룹만 선택합니다.

## 4. WHERE와 HAVING의 조합
복잡한 조건 분석 시 두 절을 함께 사용합니다.
```sql
-- 독립년도 1900년 이후 국가 중, 대륙별 평균 기대수명이 70세 이상인 대륙
SELECT continent, AVG(lifeexpectancy)
FROM country
WHERE indepyear >= 1900        -- 개별 행 필터링
GROUP BY continent
HAVING AVG(lifeexpectancy) >= 70;  -- 그룹 필터링
```

**처리 흐름**:
1. WHERE로 1900년 이후 독립 국가만 선택
2. 대륙별로 그룹화
3. HAVING으로 평균 기대수명 70세 이상인 대륙만 선택

## 5. JOIN의 이해와 활용
여러 테이블의 데이터를 연결하여 의미 있는 정보를 도출합니다.

**INNER JOIN**:
- 두 테이블에서 조건이 일치하는 행만 반환
- 가장 일반적으로 사용되는 JOIN
```sql
-- 국가와 도시 정보 연결
SELECT co.name AS country_name, ci.name AS city_name
FROM country co
JOIN city ci ON co.code = ci.countrycode;
```

**LEFT JOIN**:
- 왼쪽 테이블의 모든 데이터를 보존
- 오른쪽 테이블에 매칭되는 데이터가 없으면 NULL 표시

**JOIN 선택 기준**:
- "모든 X를 보고 싶다" → X 테이블을 FROM에, LEFT JOIN 사용
- "조건을 만족하는 데이터만" → INNER JOIN 사용

## 6. 다중 JOIN (Multiple Joins)
3개 이상의 테이블을 체인처럼 연결할 수 있습니다.
```sql
-- 국가 - 수도 - 공식언어 연결
SELECT 
    co.name AS country_name, 
    ci.name AS capital_city,
    cl."Language"
FROM country co
JOIN city ci ON co.capital = ci.id
JOIN countrylanguage cl ON co.code = cl.countrycode
WHERE cl.isofficial = 'T';
```

**연결 구조**:
```
country → city → countrylanguage
   (co)     (ci)      (cl)
```

## 7. 실습 쿼리 전체 모음

### HAVING 절 실습 (city/country)
```sql
-- 각 국가별 도시가 10개 이상인 국가의 CountryCode, 도시 수를 조회하시오.
SELECT countrycode, COUNT(*) AS city_count
FROM city
GROUP BY countrycode
HAVING COUNT(*) >= 10;

-- District별 평균 인구가 100만 이상이면서 도시 수가 3개 이상인 District, 도시 수, 총 인구를 구하시오
SELECT district, COUNT(*) AS city_count, SUM(population) AS total_pop
FROM city
GROUP BY district
HAVING AVG(population) >= 1000000 AND COUNT(*) >= 3;

-- 아시아 대륙의 국가들 중에서, Region별 평균 GNP가 1000 이상인 Region, 평균 GNP를 조회하시오
SELECT region, AVG(gnp)
FROM country
WHERE continent = 'Asia'
GROUP BY region
HAVING AVG(gnp) >= 1000; 

-- 독립년도가 1900년 이후인 국가들 중에서, 대륙별 평균 기대수명이 70세 이상인 Continent, 평균 기대수명을 조회하시오.
SELECT continent, AVG(lifeexpectancy)
FROM country
WHERE indepyear >= 1900
GROUP BY continent
HAVING AVG(lifeexpectancy) >= 70;

-- CountryCode별 도시 평균 인구가 100만 이상이고, CountryCode별 도시 최소 인구가 50만 이상인 데이터에서 CountryCode, 총 도시수, 총 인구수를 조회하시오.
SELECT countrycode, COUNT(*), SUM(population)
FROM city
GROUP BY countrycode
HAVING AVG(population) >= 1000000 AND MIN(population) >= 500000;

-- CountryCode별 인구가 50만 이상인 city의 평균 인구가 100만 이상인 국가의 CountryCode, 총 도시수, 총 인구수를 조회하시오.
SELECT countrycode, COUNT(*) AS total_cities, SUM(population) AS total_pop
FROM city
WHERE population >= 500000
GROUP BY countrycode
HAVING AVG(population) >= 1000000;
```

### film 테이블 실습 (dvdrental)
```sql
-- 1. 모든 영화의 제목과 대여료를 조회하시오.
SELECT title, rental_rate
FROM film;

-- 2. 대여료가 4달러 이상인 영화의 제목과 대여료를 조회하시오.
SELECT title, rental_rate
FROM film
WHERE rental_rate >= 4;

-- 3. 등급별 영화 수를 조회하시오.
SELECT rating, COUNT(*)
FROM film
GROUP BY rating;

-- 4. 상영 시간을 중복 제거하여 내림차순으로 정렬하고, 상위 10개를 조회하시오.
SELECT DISTINCT length
FROM film
ORDER BY length DESC
LIMIT 10;

-- 5. 대여 기간별 영화 수를 대여 기간 내림차순으로 정렬하여 조회하시오.
SELECT rental_duration, COUNT(*)
FROM film
GROUP BY rental_duration
ORDER BY rental_duration DESC;

-- 6. 대여 기간이 5일 이상이고 대여료가 4달러 이상인 영화의 제목, 대여 기간, 대여료를 조회하시오.
SELECT title, rental_duration, rental_rate
FROM film
WHERE rental_duration >= 5 AND rental_rate >= 4;

-- 7. 등급이 'R'인 영화 중 처음 10개의 제목과 등급을 조회하시오.
SELECT title, rating
FROM film
WHERE rating = 'R'
ORDER BY title
LIMIT 10;

-- 8. 대여료별 영화 수를 영화 수 내림차순으로 정렬하여 조회하시오.
SELECT rental_rate, COUNT(*)
FROM film
GROUP BY rental_rate
ORDER BY COUNT(*) DESC;

-- 9. 교체 비용별 영화 수와 평균 대여료를 교체 비용 오름차순으로 정렬하여 조회하시오.
SELECT replacement_cost, COUNT(*) AS film_count, AVG(rental_rate) AS avg_rental_rate
FROM film
GROUP BY replacement_cost
ORDER BY replacement_cost;

-- 10. 제목에 'angel'이 포함된 영화의 제목을 조회하시오.
SELECT title
FROM film
WHERE title ILIKE '%angel%';

-- 11. 등급별 평균 대여료가 3달러 미만인 등급과 평균 대여료를 조회하시오.
SELECT rating, AVG(rental_rate)
FROM film
GROUP BY rating
HAVING AVG(rental_rate) < 3;

-- 12. 상영 시간이 10번째에서 15번째로 긴 영화의 제목과 상영 시간을 조회하시오. (상영 시간이 같을 경우 제목 오름차순으로 정렬)
SELECT title, length
FROM film
ORDER BY length DESC, title ASC
LIMIT 6 OFFSET 9;

-- 13. 등급이 'PG' 또는 'G'이면서 대여 기간이 4일 이하인 영화의 제목, 등급, 대여 기간을 조회하시오.
SELECT title, rating, rental_duration
FROM film
WHERE rating IN ('PG', 'G') AND rental_duration <= 4
ORDER BY rating, rental_duration;

-- 14. 등급별 영화 수와 평균 상영 시간을 조회하시오.
SELECT rating, COUNT(*), AVG(length)
FROM film
GROUP BY rating;

-- 15. 상영 시간이 60분 이상 120분 이하인 영화의 제목과 상영 시간을 상영 시간 오름차순으로 조회하시오.
SELECT title, length
FROM film
WHERE length BETWEEN 60 AND 120
ORDER BY length;
```

### JOIN 실습 (world database)
```sql
-- 어느 나라에 속한 도시인지
SELECT 
    co.name AS country_name, 
    ci.name AS capital_city
FROM city ci
JOIN country co ON ci.countrycode = co.code;

-- 국가와 그 국가의 공식 수도를 매칭
SELECT 
    co.name AS country_name, 
    ci.name AS capital_city
FROM country co
JOIN city ci ON co.capital = ci.id;

-- 특정 대륙에 속한 도시들 목록
SELECT 
    co.continent, 
    co.name AS country_name, 
    ci.name AS city_name
FROM country co
JOIN city ci ON co.code = ci.countrycode
WHERE co.continent = 'Asia'
ORDER BY co.name, ci.name;   

-- 특정 대륙에서 인구가 500만 명 이상인 도시만 조회
SELECT 
    co.continent, 
    co.name AS country, 
    ci.name AS city, 
    ci.population
FROM country co
JOIN city ci ON co.code = ci.countrycode
WHERE co.continent = 'Asia'       
    AND ci.population >= 5000000    
ORDER BY ci.population DESC;

-- 국가와 수도, 공식언어 가져오기
SELECT 
    co.name AS country_name, 
    ci.name AS capital_city,
    cl."Language"
FROM country co
JOIN city ci ON co.capital = ci.id
JOIN countrylanguage cl ON co.code = cl.countrycode
WHERE cl.isofficial = 'T';
```

## 8. 학습 포인트 (Troubleshooting)

**GROUP BY 규칙 준수**: SELECT에 있는 모든 비집계 컬럼은 반드시 GROUP BY에 포함되어야 합니다. 이를 지키지 않으면 에러가 발생합니다.

**WHERE vs HAVING 선택**: 
- 개별 행 조건 → WHERE
- 그룹 집계 결과 조건 → HAVING
- 둘을 함께 사용할 때는 실행 순서를 고려합니다.

**JOIN 방향 선택**: "모든 X를 보고 싶다"면 X를 FROM에 두고 LEFT JOIN을 사용합니다. 조건을 만족하는 데이터만 필요하면 INNER JOIN을 사용합니다.

**대소문자 구분**: PostgreSQL에서 `LIKE`는 대소문자를 구분합니다. 대소문자 무시 검색이 필요하면 `ILIKE`를 사용합니다.

**별칭(Alias) 활용**: 복잡한 쿼리에서는 테이블 별칭(예: `country co`)과 컬럼 별칭(예: `AS city_count`)을 적극 활용하여 가독성을 높입니다.

**다중 조건 집계**: HAVING절에서 `AND`로 여러 집계 조건을 결합할 수 있습니다. (예: `AVG() >= 1000000 AND COUNT(*) >= 3`)