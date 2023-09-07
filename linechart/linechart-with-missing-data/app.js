// 参考自 https://observablehq.com/@d3/line-chart-missing-data/2

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
const width = container.clientWidth; // 宽度
const height = container.clientHeight; // 高度
const marginTop = 20;
const marginRight = 30;
const marginBottom = 30;
const marginLeft = 40;

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
// 数据来源网页 https://observablehq.com/@d3/line-chart-missing-data/2 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/61a819373d0eada06b7966a560aafc7e/raw/979711fba712b0263309234239bfbd144a8a3edc/aapl.csv";

d3.csv(dataURL, d3.autoType).then((aapl) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(aapl);

  // 💡 遍历 aapl 数组的每一个元素，修改数据点（对象）的属性 close 的值，以手动模拟数据缺失的情况
  // 当数据点所对应的日期的月份小于三月份（包含），则收盘价改为 NaN；否则就采用原始值
  // 📢 由于 JS 的日期中，月份是按 0 开始算起的，所以 1、2、3 月份是满足以下的判断条件 d.date.getUTCMonth() < 3
  const aaplMissing = aapl.map(d => ({ ...d, close: d.date.getUTCMonth() < 3 ? NaN : d.close })) // simulate gaps

  /**
   *
   * 构建比例尺
   *
   */
  // 设置横坐标轴的比例尺
  // 横坐标轴的数据是日期（时间），使用 d3.scaleUtc 构建一个时间比例尺（连续型比例尺的一种）
  // 该时间比例尺采用协调世界时 UTC，处于不同时区的用户也会显示同样的时间
  // 具体可以参考官方文档 https://d3js.org/d3-scale/time 或 https://github.com/d3/d3-scale#time-scales
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#时间比例尺-time-scales
  const x = d3.scaleUtc(
    // 设置定义域范围
    // 从数据集的每个数据点中提取出日期（时间），并用 d3.extent() 计算出它的范围
    d3.extent(aapl, d => d.date),
    // 设置值域范围（所映射的可视元素）
    // svg 元素的宽度（减去留白区域）
    [marginLeft, width - marginRight]
  );

  // 设置纵坐标轴的比例尺
  // 纵坐标轴的数据是连续型的数值（股价），使用 d3.scaleLinear 构建一个线性比例尺
  const y = d3.scaleLinear(
    // 设置定义域范围
    // [0, ymax] 其中 ymax 是股价的最高值
    // 通过 d3.max(aapl, d => d.close) 从数据集中获取股价的最大值
    [0, d3.max(aapl, d => d.close)],
    // 设置值域范围
    // svg 元素的高度（减去留白区域）
    [height - marginBottom, marginTop]
  );

  /**
   *
   * 绘制坐标轴
   *
   */
  // 绘制横坐标轴
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将横坐标轴容器「移动」到底部
    .attr("transform", `translate(0,${height - marginBottom})`)
    // 横轴是一个刻度值朝下的坐标轴
    // 通过 axis.ticks(count) 设置刻度数量的参考值（避免刻度过多导致刻度值重叠而影响图表的可读性）
    // 而且将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
    .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

  // 绘制纵坐标轴
  // Add the y-axis, remove the domain line, add grid lines and a label.
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
    .attr("transform", `translate(${marginLeft},0)`)
    // 纵轴是一个刻度值朝左的坐标轴
    // 通过 axis.ticks(count) 设置刻度数量的参考值（避免刻度过多导致刻度值重叠而影响图表的可读性）
    .call(d3.axisLeft(y).ticks(height / 40))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.select(".domain").remove())
    // 复制了一份刻度线，用以绘制图中纵向的网格参考线
    .call(g => g.selectAll(".tick line").clone()
      // 调整复制后的刻度线的终点位置（往右移动）
      .attr("x2", width - marginLeft - marginRight)
      .attr("stroke-opacity", 0.1)) // 调小网格线的透明度
    // 为坐标轴添加额外信息名称（一般是刻度值的单位等信息）
    .call(g => g.append("text")
      // 将该文本移动到坐标轴的顶部（即容器的左上角）
      .attr("x", -marginLeft)
      .attr("y", 10)
      .attr("fill", "currentColor") // 设置文本的颜色
      .attr("text-anchor", "start") // 设置文本的对齐方式
      .text("↑ Daily close ($)")); // 设置文本内容

  /**
   *
   * 绘制折线图内的线段
   *
   */
  // 使用方法 d3.line() 创建一个线段生成器
  // 线段生成器会基于给定的坐标点生成线段（或曲线）
  // 调用线段生成器时返回的结果，会基于生成器是否设置了画布上下文 context 而不同。如果设置了画布上下文 context，则生成一系列在画布上绘制路径的方法，通过调用它们可以将路径绘制到画布上；如果没有设置画布上下文 context，则生成字符串，可以作为 `<path>` 元素的属性 `d` 的值
  // 具体可以参考官方文档 https://d3js.org/d3-shape/line 或 https://github.com/d3/d3-shape/tree/main#lines
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#线段生成器-lines
  const line = d3.line()
    // 💡 调用线段生成器方法 line.defined() 设置数据完整性检验函数
    // 该函数会在调用线段生成器时，为数组中的每一个元素都执行一次，返回布尔值，以判断该元素的数据是否完整
    // 该函数也是有三个入参，当前的元素 `d`，该元素在数组中的索引 `i`，整个数组 `data`
    // 当函数返回 true 时，线段线段生成器就会执行下一步（调用坐标读取函数），最后生成该元素相应的坐标数据
    // 当函数返回 false 时，该元素就会就会跳过，当前线段就会截止，并在下一个有定义的元素再开始绘制，反映在图上就是一段段分离的线段
    // 这里通过判断数据点的属性 d.close（收盘价）是否为 NaN 来判定该数据是否缺失
    .defined(d => !isNaN(d.close))
    // 设置横坐标读取函数
    // 该函数会在调用线段生成器时，为数组中的每一个元素都执行一次，以返回该数据所对应的横坐标
    // 这里基于每个数据点的日期（时间）d.date 并采用比例尺 x 进行映射，计算出相应的横坐标
    .x(d => x(d.date))
    // 设置纵坐标读取函数
    .y(d => y(d.close));

  // 💡 先绘制灰色的线段
  svg.append("path") // 使用路径 <path> 元素绘制折线
    // 只需要路径的描边作为折线，不需要填充，所以属性 fill 设置为 none
    .attr("fill", "none")
    // 设置描边颜色
    .attr("stroke", "#ccc")
    // 设置描边宽度
    .attr("stroke-width", 1.5)
    // 这里采用过滤掉缺失的数据点的 aaplMissing 作为绘制线段的数据集
    // 由于线段生成器并没有调用方法 line.context(parentDOM) 设置父容器
    // 所以调用线段生成器 line(aapl) 返回的结果是字符串
    // 该值作为 `<path>` 元素的属性 `d` 的值
    .attr("d", line(aaplMissing.filter(d => !isNaN(d.close))));
  // 其实以上的操作绘制了一个完整的折线图，由于过滤掉缺失的数据点，所以可以绘制出了一个完整（无缺口）的折线图
  // 由于 **线性插值法 linear interpolation** 是线段生成器在绘制线段时所采用的默认方法，所以对于那些缺失数据的位置，通过连接左右存在的完整点，绘制出的「模拟」线段来填补缺口

  // 将线段路径绘制到页面上
  svg.append("path")
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    // 这里采用含有缺失数据的 aaplMissing 作为绘制线段的数据集
    .attr("d", line(aaplMissing));
  // 由于含有缺失数据，所以绘制出含有缺口的折线图
  // 蓝色折线图覆盖（重叠）在前面所绘制的灰色折线图上，所以最终的效果是在缺口位置由灰色的线段填补
});
