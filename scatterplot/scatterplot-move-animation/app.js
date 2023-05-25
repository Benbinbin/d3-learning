// 参考自 https://observablehq.com/@mbostock/the-wealth-health-of-nations

/**
 *
 * 用于转换、读取、计算数据的相关函数
 *
 */

// 主要是将原始数据中的二元数组（具有两个元素的数组）中的第一个元素转换为 Date 日期对象
const parseSeries = (series) => {
  return series.map(([year, value]) => [new Date(Date.UTC(year, 0, 1)), value]);
};

// 基于原始的数据集（推测）计算出相应日期的值
// 使用 bisection 二分查找算法和 linear interpolation 线性插值法
// 基于原始的（以年为间距单位）数据集 values 来（推测）计算出给定月份 date 的数据
function valueAt(values, date) {
  // 二元分割
  // 使用 d3.bisector(accessor) 创建一个分割器
  // 因为入参的数据集（数组）是较为较复杂的，数组的元素是一个二元数组，所以需要设置访问器 accessor，从元素中提取出 date 日期对象，以便进行比对
  // 参考 D3 的 d3-array 模块 https://github.com/d3/d3-array 和笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#二元分割
  const bisectDate = d3.bisector(([date]) => date).left; // 采用「左分割」

  // 使用分割器 bisectDate 获取给定月份 date 应该介于哪两个原始数据（年份）之间
  // 其实第三、第四个参数可以省略？因为分割器默认就是针对整个数组 values
  // 返回的是一个索引值（如果将 date 插入到这个索引值的位置后，依然保持 values 中的年份数据是有序的）
  const i = bisectDate(values, date, 0, values.length - 1);
  // 因为采用的是「左分割」，所以通过该索引值 i 获取得到的数据点 values[i]，是在 date 日期实际所对应的数据点的右侧
  const a = values[i]; // 左侧的点
  // 判断索引值是否大于 0
  if (i > 0) {
    const b = values[i - 1]; // 右侧的点
    // 通过左右两侧的点，使用 linear interpolation 线性插值法（比例按照线性关系），估算出给定日期 date 所对应的数据
    const t = (date - a[0]) / (b[0] - a[0]); // 斜率
    return a[1] * (1 - t) + b[1] * t; // 估算的值
  }
  return a[1]; // 因为如果索引值等于 0 则表示 date 日期起始就是和原始数据的起始日期相同，应该直接返回端点的原始数据 a[1]
}

// 基于日期 date 从数据集中获取（或计算出）相应的数据
const dataAt = (data, date) => {
  // 原数据中的每一个数据点都是一个表示国家的对象
  return data.map((d) => ({
    name: d.name,
    region: d.region,
    // 主要是需要基于日期 date 对以下三个属性的值进行转换
    // 只读取/计算出相应日期的数据值
    income: valueAt(d.income, date),
    population: valueAt(d.population, date),
    lifeExpectancy: valueAt(d.lifeExpectancy, date)
  }));
};

/**
 *
 * 构建 svg 并获取尺寸大小等参数
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
const width = container.clientWidth; // 宽度
const height = container.clientHeight; // 高度

const margin = { top: 20, right: 20, bottom: 35, left: 40 };

// 创建 svg
// 在容器 <div id="container"> 元素内创建一个 SVG 元素
// 返回一个选择集，只有 svg 一个元素
const svg = d3
  .select("#container")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [0, 0, width, height]);

/**
 *
 * 异步获取数据
 * 再在回调函数中执行绘制操作
 *
 */
// 数据来源 https://observablehq.com/@mbostock/the-wealth-health-of-nations
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/26ca6aed886aef9e5f662f6f98535290/raw/834fb5232b06c2055ba64fdc16195b0400c103ee/wealth-health-of-nations.json";

d3.json(dataURL).then((result) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  // console.log(result);

  /**
   *
   * 解析数据
   *
   */
  // 将原始数据中的年份（数值）使用 parseSeries 方法转换为 Date 对象
  const data = result.map(
    ({ name, region, income, population, lifeExpectancy }) => ({
      name,
      region,
      income: parseSeries(income),
      population: parseSeries(population),
      lifeExpectancy: parseSeries(lifeExpectancy)
    })
  );

  console.log(data);

  /**
   *
   * 构建日期列表
   *
   */
  // 时间边距计算器
  // 以月为间距，时间格式采用 UTC 世界协调时间
  // 参考 D3 的 d3-time 模块 https://github.com/d3/d3-time 和笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#时间边距计算器
  // 时距器可用于进行时间修约，获取满足不同需求的 Date 日期对象
  const interval = d3.utcMonth; // interval between animation frames
  // 采用的时距器是以月为间距（而不是以年为间距）
  // 这和原始数据的间隔不同，原始数据集是以年为单位（虽然不一定每个国家都有每一年的数据）
  // 由于以年为间距时，每个国家的相关数据变化会比较大
  // 则在使用动画展示数据变化时，在画面中每一帧的数据点的位移会很大，这样动画就会显得不流畅
  // 因此采用月为间距，再使用 bisection 二分查找算法和 linear interpolation 线性插值基于原始的（以年为间距单位）数据来（推测）计算出每个月的数据
  // 采用更小的时间间距，数据的差值会更小，这样每一帧的数据点的位移就不会那么大，可以让动画显得更顺滑

  // 构建日期数组，通过切换日期获取新数据，用于制作动画
  // 使用时距器的方法 interval.range(start, stop, step)
  // 基于数据集中的年份范围，和间隔距离（每月采集一个时间点），得出一系列的 Date 日期对象
  const dates = interval.range(
    // 获取时间范围的下限（最早的年份）
    // 数据集的结构比较复制，所以第二个参数是转换函数，对数据进行处理以读取其中的日期值
    d3.min(data, (d) => {
      // 每一个数据点都是一个表示国家的对象
      // 在这个对象里，三个属性 income、population、lifeExpectancy 包含日期数据
      // 这三个属性的值都是一个列表，里面的元素都是按照年份进行排序的，所以第一个元素的日期是最早的
      return d3.min(
        // 提取三个属性的列表里第一个值
        [d.income[0], d.population[0], d.lifeExpectancy[0]],
        // 因为所提取的第一个值也是一个数组（一个二元数组，即有两个元素）
        // 所以也需要设置转换函数，提取其中第一个元素（年份）
        ([date]) => date
      );
    }),
    // 获取时间范围的上线（最近的年份）
    // 这里取所有国家所具有的最大年份的最小值（？避免某些国家在最近年份存在数据缺失）
    d3.min(data, (d) => {
      // 也是从三个属性 income、population、lifeExpectancy 中提取日期数据
      // 取它们最大值
      return d3.max(
        // 列表的最后一个元素就包含最近年份的数据
        [
          d.income[d.income.length - 1],
          d.population[d.population.length - 1],
          d.lifeExpectancy[d.lifeExpectancy.length - 1]
        ],
        ([date]) => date
      );
    })
  );
  // console.log(dates);

  /**
   *
   * 构建一些绘制散点图时所需的相关元素
   *
   */
  // X 轴比例尺，对数比例尺
  // 因为人均收入，各国差距很大，从 200 美元到 1e5=100000美元，采用对数比例尺
  const x = d3.scaleLog([200, 1e5], [margin.left, width - margin.right]);

  // Y 轴比例尺，线性比例尺
  const y = d3.scaleLinear([14, 86], [height - margin.bottom, margin.top]);

  // 面积比例尺，幂比例尺
  // 因为人口数量映射为数据点的面积（线性映射）area = m*population + b
  // 而在绘制 svg 元素 <circle> 时是通过指定半径 r 参数来决定面积大小的
  // 所以实际需要将人口数量映射为圆形的半径 r = m*population^0.5 + b
  // 映射关系是幂关系，幂为 0.5
  // 采用 d3.scaleSqrt() 创建比例尺，实际上是幂比例尺 d3.scalePow().exponent(0.5) 的别名，一个更便捷的封装方法
  const radius = d3.scaleSqrt([0, 5e8], [0, width / 24]);
  // 这里要与径向比例尺 `d3.scaleRadial()` 区分，该也是将数据映射为面积，即映射关系是将定义域的值与值域的值的平方构成线性关系。但实际和 `d3.scaleSqrt()` 略有不同，这个映射关系好像是会随着半径而变化(?)
  // 一般用于径向条形图中
  // 实际用例 https://observablehq.com/@d3/radial-stacked-bar-chart
  // 相关的讨论 https://github.com/d3/d3-scale/issues/90

  // 排序比例尺
  // 将国家所属的地区（离散值）映射为不同的颜色（离散值），以进行区分标注
  // 如果国家没有具体所属的地区，则采用黑色标注
  const color = d3
    .scaleOrdinal(
      data.map((d) => d.region),
      d3.schemeCategory10
    )
    .unknown("black");

  // 横坐标轴
  const xAxis = (g) =>
    g
      .attr("transform", `translate(0,${height - margin.bottom})`) // 将横坐标轴容器定位到底部
      // 基于给定的比例尺 x 构建一个坐标轴
      // 并设置刻度值的格式，千位以逗号分隔
      .call(d3.axisBottom(x).ticks(width / 80, ",")) // 刻度值的数量与页面的宽度相关
      .call((g) => g.select(".domain").remove()) // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
      .call((g) =>
        g
          .append("text") // 为坐标轴添加额外信息名称（一般是刻度值的单位等信息）
          // 将该文本移动到坐标轴的右侧（即容器的右下角）
          .attr("x", width)
          .attr("y", margin.bottom - 4)
          .attr("fill", "currentColor")
          .attr("text-anchor", "end") // 设置文本的对齐方式
          .text("Income per capita (dollars) →")
      ); // 文本内容

  // 纵坐标轴
  const yAxis = (g) =>
    g
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .append("text")
          .attr("x", -margin.left)
          .attr("y", 10)
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .text("↑ Life expectancy (years)")
      );

  // 网格参考线
  const grid = (g) =>
    g
      .attr("stroke", "currentColor") // 设置参考线的颜色
      .attr("stroke-opacity", 0.1) // 调小网格参考线的透明度
      // 构建网格参考线的竖线
      .call((g) =>
        g
          .append("g")
          .selectAll("line")
          // x.ticks() 方法返回一个数组，是将比例尺定义域均匀分割所构成的数组
          // 数组的元素数量和坐标轴度线的数量相同
          // 所以 <link> 元素选择集绑定的数据是一系列取自 X 轴定义域的值
          .data(x.ticks())
          .join("line")
          // 绘制线段
          // 由于是竖线，所以线段的起始点和结束点的 x1 和 x2 位置是相同的
          // 该位置通过 X 轴比例尺 x(d) 算出（其中加上 0.5 是为了做一点偏移，让分割线和刻度线别重合？）
          .attr("x1", (d) => 0.5 + x(d))
          .attr("x2", (d) => 0.5 + x(d))
          // 而线段的起始点和结束点的 y1 和 y2 位置与容器的高度值 height 相关
          .attr("y1", margin.top)
          .attr("y2", height - margin.bottom)
      )
      // 构建网格参考线的横线
      .call((g) =>
        g
          .append("g")
          .selectAll("line")
          .data(y.ticks())
          .join("line")
          .attr("y1", (d) => 0.5 + y(d))
          .attr("y2", (d) => 0.5 + y(d))
          .attr("x1", margin.left)
          .attr("x2", width - margin.right)
      );
  // 绘制网格参考线的另一种方法：拷贝坐标轴的刻度线并进行延伸
  // 参考 https://observablehq.com/@benbinbin/scatterplot#Scatterplot

  /**
   *
   * 绘制散点图
   *
   */
  // 绘制横坐标轴
  svg.append("g").call(xAxis); // 调用坐标轴（对象）方法，将坐标轴在相应容器内部渲染出来

  // 绘制纵坐标轴
  svg.append("g").call(yAxis);

  // 绘制网格参考线
  svg.append("g").call(grid);

  // 绘制数据点（初始状态）
  const circle = svg
    .append("g")
    .attr("stroke", "black")
    .selectAll("circle")
    // 绑定数据
    // 并将国家的名称设置为 key，这样在之后不断更新数据时，可以复用页面上这些数据点，从而构成连续的动画
    .data(dataAt(data, 1800), (d) => d.name) // 基于日期来获取数据，初始状态的日期是 1800 年
    .join("circle")
    // 在（通过设置参数）绘制数据点前，先基于人口值进行降序排序（较大的值排在前面，较小的值排在后面）
    // 根据 svg 的绘图原理，先绘制的元素层级较低，后绘制的元素层级较高（叠放在上层）
    // 这样就可以保证图中面积较小的数据点（对应于人口较少的国家）叠放在面积较大的数据点之上，避免被遮挡
    .sort((a, b) => d3.descending(a.population, b.population))
    // 设置数据点的位置、大小、颜色
    .attr("cx", (d) => x(d.income)) // 基于 X 轴比例尺，计算出数据点的横向值
    .attr("cy", (d) => y(d.lifeExpectancy)) // 基于 Y 轴比例尺，计算出数据点的纵向值
    .attr("r", (d) => radius(d.population)) // 数据点的（半径）大小
    .attr("fill", (d) => color(d.region)) // 数据点的颜色
    // 为数据点添加描述性字符串 <title> 元素
    // 当鼠标 hover 到数据点时，会弹出一个 tooltip 显示这个描述性字符串
    .call((circle) =>
      circle
        .append("title")
        // 设置文本内容
        // 由该数据点所代表的国家和所在的区域（通过换行符来连接）
        .text((d) => [d.name, d.region].join("\n"))
    );

  /**
   *
   * 制作动画
   *
   */
  // 更新页面上的数据点的属性（位置和大小）
  const update = (data) => {
    circle
      .data(data, (d) => d.name)
      // 每次获取新数据后，先对数据基于人口值进行降序排序
      // 以保证页面上面积较小的数据点不会被遮挡
      .sort((a, b) => d3.descending(a.population, b.population))
      .attr("cx", (d) => x(d.income))
      .attr("cy", (d) => y(d.lifeExpectancy))
      .attr("r", (d) => radius(d.population));
  };

  let index = 1;
  let year = 1800;
  const yearDOM = document.getElementById("year");

  const timer = setInterval(() => {
    if (index < dates.length) {
      // 基于日期获取新的数据
      const currentDate = dates[index];
      const currentYear = currentDate.getFullYear();
      console.log(currentYear);
      if (year !== currentYear) {
        yearDOM.innerText = currentYear;
      }
      const currentData = dataAt(data, currentDate);
      update(currentData);
      index++;
    } else {
      clearInterval(timer);
    }
  }, 5);
});
